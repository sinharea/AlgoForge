"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AlertCircle, Loader2, MessageSquareText, Scale } from "lucide-react";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";
import {
  interviewApi,
  InterviewComplexityComparison,
  InterviewMessage,
} from "@/src/api/interviewApi";
import ChatBubble from "@/src/components/interview/ChatBubble";
import MessageInput from "@/src/components/interview/MessageInput";

export default function InterviewPage() {
  const { ready } = useProtectedRoute();
  const { sessionId } = useParams<{ sessionId: string }>();

  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [latestComparison, setLatestComparison] =
    useState<InterviewComplexityComparison | null>(null);
  const [currentStage, setCurrentStage] = useState<"approach" | "complexity" | "edge_cases" | "optimization" | "coding">("approach");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastSpokenInterviewerMessageRef = useRef<string>("");

  const stageLabel = {
    approach: "Approach",
    complexity: "Complexity",
    edge_cases: "Edge Cases",
    optimization: "Optimization",
    coding: "Coding Discussion",
  };

  const sessionQuery = useQuery({
    queryKey: ["interview-session", sessionId],
    queryFn: async () => (await interviewApi.getById(sessionId)).data,
    enabled: ready && Boolean(sessionId),
  });

  useEffect(() => {
    if (sessionQuery.data?.messages) {
      setMessages(sessionQuery.data.messages);
    }
    if (sessionQuery.data?.latestComplexityComparison !== undefined) {
      setLatestComparison(sessionQuery.data.latestComplexityComparison || null);
    }
    if (sessionQuery.data?.currentStage) {
      setCurrentStage(sessionQuery.data.currentStage);
    }
  }, [sessionQuery.data]);

  const respondMutation = useMutation({
    mutationFn: async (userMessage: string) =>
      (await interviewApi.respond({ sessionId, userMessage })).data,
    onMutate: async (userMessage) => {
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: userMessage,
          timestamp: new Date().toISOString(),
        },
      ]);
    },
    onSuccess: (data) => {
      setMessages(data.messages || []);
      if (data.currentStage) {
        setCurrentStage(data.currentStage);
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || "Failed to send message");
      sessionQuery.refetch();
    },
  });

  const compareMutation = useMutation({
    mutationFn: async () => (await interviewApi.compare({ sessionId })).data,
    onSuccess: (data) => {
      const nextComparison = data.latestComplexityComparison || data.comparison || null;
      setLatestComparison(nextComparison);
      if (nextComparison) {
        toast.success("Complexity comparison updated");
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || "Failed to compare complexity");
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, respondMutation.isPending]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const lastInterviewerMessage = [...messages]
      .reverse()
      .find((message) => message.role === "interviewer");

    if (!lastInterviewerMessage?.content) return;

    const messageKey = `${lastInterviewerMessage.timestamp || ""}:${lastInterviewerMessage.content}`;
    if (lastSpokenInterviewerMessageRef.current === messageKey) return;

    lastSpokenInterviewerMessageRef.current = messageKey;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(lastInterviewerMessage.content);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, [messages]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const problem = sessionQuery.data?.problem;
  const hasUserMessages = useMemo(
    () => messages.some((message) => message.role === "user"),
    [messages]
  );

  const title = useMemo(() => {
    if (!problem) return "Interview Session";
    return `${problem.title} (${problem.difficulty})`;
  }, [problem]);

  const verdictMeta = useMemo(() => {
    if (!latestComparison) {
      return {
        label: "No comparison yet",
        className: "bg-slate-500/10 text-slate-200 border-slate-500/30",
      };
    }

    const verdict = latestComparison.comparison.verdict;
    if (verdict === "equal") {
      return {
        label: "Matches Optimal",
        className: "bg-emerald-500/15 text-emerald-200 border-emerald-400/40",
      };
    }
    if (verdict === "better") {
      return {
        label: "Better Than Baseline",
        className: "bg-cyan-500/15 text-cyan-200 border-cyan-400/40",
      };
    }
    if (verdict === "worse") {
      return {
        label: "Needs Optimization",
        className: "bg-amber-500/15 text-amber-200 border-amber-400/40",
      };
    }

    return {
      label: "Uncertain",
      className: "bg-slate-500/10 text-slate-200 border-slate-500/30",
    };
  }, [latestComparison]);

  if (!ready || sessionQuery.isLoading) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-8 sm:px-6">
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading interview session...
        </div>
      </div>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6">
          <div className="flex items-center gap-2 text-rose-300">
            <AlertCircle className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Unable to load interview session</h1>
          </div>
          <p className="mt-2 text-sm text-rose-200/90">Try starting a new interview from the problem page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-color)] pb-4">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <MessageSquareText className="h-5 w-5 text-[var(--accent-secondary)]" />
              {title}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Talk through your approach. The interviewer will guide with follow-up questions and hints.
            </p>
            <p className="mt-2 inline-flex rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
              Stage: {stageLabel[currentStage]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={compareMutation.isPending || respondMutation.isPending}
              onClick={() => {
                if (!hasUserMessages) {
                  toast.error("Share your approach first, then compare complexity");
                  return;
                }
                compareMutation.mutate();
              }}
            >
              {compareMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Comparing...
                </>
              ) : (
                <>
                  <Scale className="h-4 w-4" />
                  Compare Complexity
                </>
              )}
            </button>

            {problem?.slug ? (
              <Link href={`/problems/${problem.slug}`} className="btn btn-secondary">
                Back to Problem
              </Link>
            ) : null}
          </div>
        </div>

        <div className="max-h-[62vh] space-y-3 overflow-y-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No conversation yet.</p>
          ) : (
            messages.map((message, index) => (
              <ChatBubble
                key={`${message.role}-${index}-${message.timestamp}`}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
              />
            ))
          )}

          {respondMutation.isPending ? (
            <div className="flex justify-start">
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-2 text-xs text-[var(--text-muted)]">
                Interviewer is thinking...
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>

        {latestComparison ? (
          <div className="mt-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Complexity Comparison</h2>
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${verdictMeta.className}`}>
                {verdictMeta.label}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-3">
                <p className="text-xs uppercase tracking-wide text-cyan-200/80">Your Complexity (AI)</p>
                <p className="mt-2 text-sm text-cyan-100">
                  Time: <span className="font-semibold">{latestComparison.userComplexity.time}</span>
                </p>
                <p className="text-sm text-cyan-100">
                  Space: <span className="font-semibold">{latestComparison.userComplexity.space}</span>
                </p>
                <p className="mt-1 text-xs text-cyan-200/80">
                  Confidence: {Math.round((latestComparison.userComplexity.confidence || 0) * 100)}%
                </p>
              </div>

              <div className="rounded-lg border border-violet-500/20 bg-violet-500/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-wide text-violet-200/80">Optimal Complexity</p>
                  <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-100/90">
                    {latestComparison.optimalComplexity.source === "problem_data"
                      ? "from problem data"
                      : "from AI"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-violet-100">
                  Time: <span className="font-semibold">{latestComparison.optimalComplexity.time}</span>
                </p>
                <p className="text-sm text-violet-100">
                  Space: <span className="font-semibold">{latestComparison.optimalComplexity.space}</span>
                </p>
              </div>
            </div>

            <p className="mt-3 text-sm text-[var(--text-secondary)]">{latestComparison.comparison.summary || "No summary available."}</p>
            {latestComparison.comparison.recommendation ? (
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Recommendation: {latestComparison.comparison.recommendation}
              </p>
            ) : null}
          </div>
        ) : null}

        <MessageInput
          onSend={(message) => respondMutation.mutate(message)}
          disabled={respondMutation.isPending}
        />
      </div>
    </div>
  );
}
