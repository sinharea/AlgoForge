"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AlertCircle, Loader2, MessageSquareText } from "lucide-react";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";
import { interviewApi, InterviewMessage } from "@/src/api/interviewApi";
import ChatBubble from "@/src/components/interview/ChatBubble";
import MessageInput from "@/src/components/interview/MessageInput";

export default function InterviewPage() {
  const { ready } = useProtectedRoute();
  const { sessionId } = useParams<{ sessionId: string }>();

  const [messages, setMessages] = useState<InterviewMessage[]>([]);
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

  const title = useMemo(() => {
    if (!problem) return "Interview Session";
    return `${problem.title} (${problem.difficulty})`;
  }, [problem]);

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
          {problem?.slug ? (
            <Link href={`/problems/${problem.slug}`} className="btn btn-secondary">
              Back to Problem
            </Link>
          ) : null}
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

        <MessageInput
          onSend={(message) => respondMutation.mutate(message)}
          disabled={respondMutation.isPending}
        />
      </div>
    </div>
  );
}
