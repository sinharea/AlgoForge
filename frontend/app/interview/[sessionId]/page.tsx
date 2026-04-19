"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { clsx } from "clsx";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Code2,
  Loader2,
  MessageSquareText,
  Scale,
  Save,
  Square,
  Star,
  Target,
  Trophy,
  History,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";
import {
  interviewApi,
  InterviewComplexityComparison,
  InterviewHistoryItem,
  InterviewMessage,
  InterviewScoring,
} from "@/src/api/interviewApi";
import ChatBubble from "@/src/components/interview/ChatBubble";
import MessageInput from "@/src/components/interview/MessageInput";

const STAGES = ["approach", "complexity", "edge_cases", "optimization", "coding"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_META: Record<Stage, { label: string; icon: typeof Target }> = {
  approach: { label: "Approach", icon: Target },
  complexity: { label: "Complexity", icon: Clock },
  edge_cases: { label: "Edge Cases", icon: AlertCircle },
  optimization: { label: "Optimization", icon: Zap },
  coding: { label: "Coding", icon: Code2 },
};

function StageStepper({ current }: { current: Stage }) {
  const currentIdx = STAGES.indexOf(current);
  return (
    <div className="flex items-center gap-1">
      {STAGES.map((stage, i) => {
        const { label, icon: Icon } = STAGE_META[stage];
        const isActive = i === currentIdx;
        const isDone = i < currentIdx;
        return (
          <div key={stage} className="flex items-center gap-1">
            {i > 0 && (
              <div
                className={clsx(
                  "hidden h-px w-4 sm:block",
                  isDone ? "bg-emerald-400/60" : "bg-[var(--border-color)]"
                )}
              />
            )}
            <div
              className={clsx(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                isActive
                  ? "border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 text-[var(--accent-secondary)] shadow-[0_0_8px_rgba(var(--accent-rgb),0.15)]"
                  : isDone
                    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                    : "border-[var(--border-color)] bg-transparent text-[var(--text-muted)]"
              )}
            >
              {isDone ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
              <span className="hidden sm:inline">{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const fill = (score / 100) * circumference;
  const color =
    score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-rose-400";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={4} className="text-[var(--border-color)]" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - fill}
          strokeLinecap="round"
          className={clsx("transition-all duration-700", color)}
        />
      </svg>
      <span className={clsx("absolute text-lg font-bold", color)}>{Math.round(score)}</span>
    </div>
  );
}

function ScoreBreakdown({ scoring }: { scoring: InterviewScoring }) {
  const items = [
    { label: "Correctness", value: scoring.correctness, max: 25 },
    { label: "Optimality", value: scoring.optimality, max: 25 },
    { label: "Communication", value: scoring.communication, max: 20 },
    { label: "Edge Cases", value: scoring.edgeCases, max: 15 },
    { label: "Code Quality", value: scoring.codeQuality, max: 15 },
  ];
  return (
    <div className="space-y-2">
      {items.map(({ label, value, max }) => {
        const pct = max > 0 ? Math.max(0, Math.min((value / max) * 100, 100)) : 0;
        return (
          <div key={label}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-secondary)]">{label}</span>
              <span className="font-medium text-[var(--text-primary)]">
                {value}/{max}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--bg-tertiary)]">
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-500",
                  pct >= 75 ? "bg-emerald-400" : pct >= 40 ? "bg-amber-400" : "bg-rose-400"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
      {(scoring.hintsUsedPenalty > 0 || scoring.skipPenalty > 0 || scoring.timePenalty > 0) && (
        <div className="mt-2 flex gap-3 text-[11px] text-rose-300">
          {scoring.hintsUsedPenalty > 0 && <span>Hints penalty: -{scoring.hintsUsedPenalty}</span>}
          {scoring.skipPenalty > 0 && <span>Skip penalty: -{scoring.skipPenalty}</span>}
          {scoring.timePenalty > 0 && <span>Time penalty: -{scoring.timePenalty}</span>}
        </div>
      )}
    </div>
  );
}

function ScoringPanel({ scoring, duration }: { scoring: InterviewScoring; duration?: number }) {
  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-amber-400" />
        <h2 className="text-lg font-bold text-[var(--text-primary)]">Interview Complete</h2>
        {duration != null && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <Clock className="h-3 w-3" /> {Math.round(duration / 60)}m {Math.round(duration % 60)}s
          </span>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-2">
          <ScoreRing score={scoring.totalScore} />
          <span className="text-xs font-medium text-[var(--text-secondary)]">Overall Score</span>
        </div>
        <ScoreBreakdown scoring={scoring} />
      </div>

      {scoring.feedback && (
        <p className="mt-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)]/50 p-3 text-sm text-[var(--text-secondary)]">
          {scoring.feedback}
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {scoring.strengths?.length > 0 && (
          <div className="rounded-lg border border-[#9ed6b7] bg-[#e8f7ed] p-3">
            <h3 className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[#1d6b44]">
              <Star className="h-3 w-3" /> Strengths
            </h3>
            <ul className="space-y-1">
              {scoring.strengths.map((s, i) => (
                <li key={i} className="text-xs text-[#21573d]">+ {s}</li>
              ))}
            </ul>
          </div>
        )}
        {scoring.weaknesses?.length > 0 && (
          <div className="rounded-lg border border-[#e2b1b1] bg-[#fce9e9] p-3">
            <h3 className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-[#8a2f2f]">
              <XCircle className="h-3 w-3" /> Areas to Improve
            </h3>
            <ul className="space-y-1">
              {scoring.weaknesses.map((w, i) => (
                <li key={i} className="text-xs text-[#7a3333]">- {w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function mapHistoryItemToScoring(item?: InterviewHistoryItem | null): InterviewScoring | null {
  if (!item?.scoring) return null;

  return {
    totalScore: item.scoring.totalScore ?? item.score ?? 0,
    correctness: item.scoring.correctness ?? 0,
    optimality: item.scoring.optimality ?? 0,
    communication: item.scoring.communication ?? 0,
    edgeCases: item.scoring.edgeCases ?? 0,
    codeQuality: item.scoring.codeQuality ?? 0,
    hintsUsedPenalty: item.scoring.hintsUsedPenalty ?? 0,
    skipPenalty: item.scoring.skipPenalty ?? 0,
    timePenalty: item.scoring.timePenalty ?? 0,
    feedback: "",
    strengths: [],
    weaknesses: [],
  };
}

export default function InterviewPage() {
  const { ready } = useProtectedRoute();
  const { sessionId } = useParams<{ sessionId: string }>();
  const queryClient = useQueryClient();

  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [latestComparison, setLatestComparison] =
    useState<InterviewComplexityComparison | null>(null);
  const [currentStage, setCurrentStage] = useState<Stage>("approach");
  const [sessionStatus, setSessionStatus] = useState<"active" | "completed" | "abandoned">("active");
  const [scoring, setScoring] = useState<InterviewScoring | null>(null);
  const [sessionDuration, setSessionDuration] = useState<number | undefined>();
  const [codeValue, setCodeValue] = useState("");
  const [codeLang, setCodeLang] = useState("javascript");
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isHistoryScoreModalOpen, setIsHistoryScoreModalOpen] = useState(false);
  const [historyScoreSessionId, setHistoryScoreSessionId] = useState<string | null>(null);
  const [isEndScoreModalOpen, setIsEndScoreModalOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastSpokenInterviewerMessageRef = useRef<string>("");

  const sessionQuery = useQuery({
    queryKey: ["interview-session", sessionId],
    queryFn: async () => (await interviewApi.getById(sessionId)).data,
    enabled: ready && Boolean(sessionId),
  });

  const historyQuery = useQuery({
    queryKey: ["interview-history"],
    queryFn: async () => (await interviewApi.getHistory({ page: 1, limit: 20, status: "all" })).data,
    enabled: ready,
  });

  const historyScoreDetailQuery = useQuery({
    queryKey: ["interview-history-score", historyScoreSessionId],
    queryFn: async () => {
      if (!historyScoreSessionId) throw new Error("History session id is required");
      return (await interviewApi.getById(historyScoreSessionId)).data;
    },
    enabled: ready && Boolean(historyScoreSessionId),
  });

  useEffect(() => {
    if (!sessionQuery.data) return;
    setMessages(sessionQuery.data.messages || []);
    setLatestComparison(sessionQuery.data.latestComplexityComparison || null);
    if (sessionQuery.data.currentStage) setCurrentStage(sessionQuery.data.currentStage);
    if (sessionQuery.data.status) setSessionStatus(sessionQuery.data.status);
    if (sessionQuery.data.scoring) setScoring(sessionQuery.data.scoring);
    if (sessionQuery.data.duration != null) setSessionDuration(sessionQuery.data.duration);
  }, [sessionQuery.data]);

  const respondMutation = useMutation({
    mutationFn: async (userMessage: string) =>
      (await interviewApi.respond({ sessionId, userMessage })).data,
    onMutate: async (userMessage) => {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: userMessage, timestamp: new Date().toISOString() },
      ]);
    },
    onSuccess: (data) => {
      setMessages(data.messages || []);
      if (data.currentStage) setCurrentStage(data.currentStage);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || "Failed to send message");
      sessionQuery.refetch();
    },
  });

  const compareMutation = useMutation({
    mutationFn: async () => {
      const normalizedSolution = codeValue.trim();
      const payload = normalizedSolution
        ? { sessionId, userSolution: normalizedSolution }
        : { sessionId };

      return (await interviewApi.compare(payload)).data;
    },
    onSuccess: (data) => {
      const nextComparison = data.latestComplexityComparison || data.comparison || null;
      setLatestComparison(nextComparison);
      if (nextComparison) {
        setIsCompareModalOpen(true);
        toast.success("Complexity comparison updated");
      } else {
        toast.error("Comparison result is empty. Please try again.");
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || "Failed to compare complexity");
    },
  });

  const endMutation = useMutation({
    mutationFn: async (status: "completed" | "abandoned") =>
      (await interviewApi.end({ sessionId, status })).data,
    onSuccess: (data) => {
      setSessionStatus(data.status as any);
      if (data.scoring) setScoring(data.scoring);
      if (data.duration != null) setSessionDuration(data.duration);
      if (data.scoring) setIsEndScoreModalOpen(true);
      toast.success("Interview ended");
      queryClient.invalidateQueries({ queryKey: ["interview-session", sessionId] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || "Failed to end interview");
    },
  });

  const saveCodeMutation = useMutation({
    mutationFn: async () =>
      interviewApi.saveCode({ sessionId, code: codeValue, language: codeLang }),
    onSuccess: () => toast.success("Code snapshot saved"),
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || "Failed to save code");
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, respondMutation.isPending]);

  // Speech synthesis for interviewer messages
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const lastInterviewerMessage = [...messages].reverse().find((m) => m.role === "interviewer");
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
      if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (!isCompareModalOpen && !isHistoryScoreModalOpen && !isEndScoreModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCompareModalOpen(false);
        setIsHistoryScoreModalOpen(false);
        setIsEndScoreModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCompareModalOpen, isHistoryScoreModalOpen, isEndScoreModalOpen]);

  const problem = sessionQuery.data?.problem;
  const isActive = sessionStatus === "active";

  const hasUserMessages = useMemo(
    () => messages.some((m) => m.role === "user"),
    [messages]
  );

  const previousEndedSessions = useMemo(() => {
    const items = historyQuery.data?.items || [];
    return items.filter(
      (item) => item.sessionId !== sessionId && item.status !== "active"
    );
  }, [historyQuery.data?.items, sessionId]);

  const latestSessionId = historyQuery.data?.items?.[0]?.sessionId;

  const selectedHistoryItem = useMemo(() => {
    const items = historyQuery.data?.items || [];
    if (!historyScoreSessionId) return null;
    return items.find((item) => item.sessionId === historyScoreSessionId) || null;
  }, [historyQuery.data?.items, historyScoreSessionId]);

  const selectedHistoryScoring =
    historyScoreDetailQuery.data?.scoring || mapHistoryItemToScoring(selectedHistoryItem);

  const selectedHistoryDuration =
    historyScoreDetailQuery.data?.duration ?? selectedHistoryItem?.duration;

  const sessionOrdinalMap = useMemo(() => {
    const map = new Map<string, number>();
    const items = historyQuery.data?.items || [];
    items.forEach((item, index) => {
      map.set(item.sessionId, index + 1);
    });
    return map;
  }, [historyQuery.data?.items]);

  const title = useMemo(() => {
    if (!problem) return "Interview Session";
    return `${problem.title} (${problem.difficulty})`;
  }, [problem]);

  const verdictMeta = useMemo(() => {
    if (!latestComparison) return { label: "No comparison yet", className: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-color)]" };
    const v = latestComparison.comparison.verdict;
    if (v === "equal") return { label: "Matches Optimal", className: "bg-[#dcebdd] text-[#2f6f4e] border-[#98bba3]" };
    if (v === "better") return { label: "Better Than Baseline", className: "bg-[#e8e0cc] text-[#6d5328] border-[#c4b28f]" };
    if (v === "worse") return { label: "Needs Optimization", className: "bg-[#f1ddcc] text-[#8c5c26] border-[#d7a97a]" };
    return { label: "Uncertain", className: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-color)]" };
  }, [latestComparison]);

  const difficultyColor = problem?.difficulty === "Easy"
    ? "text-emerald-400"
    : problem?.difficulty === "Medium"
      ? "text-amber-400"
      : "text-rose-400";

  if (!ready || sessionQuery.isLoading) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center px-4 py-8 sm:px-6">
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading interview session...
        </div>
      </div>
    );
  }

  if (sessionQuery.isError || !sessionQuery.data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
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
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {problem?.slug && (
          <Link
            href={`/problems/${problem.slug}`}
            className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Problem
          </Link>
        )}
        <div className="flex items-center gap-2">
          {historyQuery.data?.items?.length ? (
            <a
              href="#interview-history"
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              <History className="h-3.5 w-3.5" /> Interview Section
            </a>
          ) : null}
          {latestSessionId && latestSessionId !== sessionId ? (
            <Link
              href={`/interview/${latestSessionId}`}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Latest Interview
            </Link>
          ) : null}
          {!isActive && (
            <span
              className={clsx(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                sessionStatus === "completed"
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-300"
                  : "border-rose-400/30 bg-rose-500/10 text-rose-300"
              )}
            >
              {sessionStatus === "completed" ? "Completed" : "Abandoned"}
            </span>
          )}
        </div>
      </div>

      {previousEndedSessions.length > 0 && (
        <div id="interview-history" className="mb-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <History className="h-4 w-4 text-[var(--accent-secondary)]" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Previous Interview Sessions</h2>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {previousEndedSessions.slice(0, 8).map((item) => {
              const sessionNumber = sessionOrdinalMap.get(item.sessionId) || 0;
              const createdLabel = item.createdAt
                ? new Date(item.createdAt).toLocaleString()
                : "Unknown date";

              return (
                <div
                  key={item.sessionId}
                  className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm transition hover:border-[var(--accent-primary)]/35 hover:bg-[var(--bg-tertiary)]"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setHistoryScoreSessionId(item.sessionId);
                      setIsHistoryScoreModalOpen(true);
                    }}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--text-primary)]">
                          {item.problem?.title || "Interview Session"}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Interview #{sessionNumber} · {createdLabel}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {item.status === "completed" ? "Completed" : "Abandoned"}
                        </p>
                      </div>
                      <span className="rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
                        Score {Number.isFinite(item.score) ? item.score : 0}
                      </span>
                    </div>
                    {item.scoring && (
                      <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                        Breakdown: C {item.scoring.correctness} | O {item.scoring.optimality} | Com {item.scoring.communication} | E {item.scoring.edgeCases} | Q {item.scoring.codeQuality}
                      </p>
                    )}
                  </button>
                  <div className="mt-2 flex justify-end">
                    <Link
                      href={`/interview/${item.sessionId}`}
                      className="text-xs font-medium text-[var(--accent-secondary)] transition hover:opacity-80"
                    >
                      Open full session
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden">
        {/* Title bar */}
        <div className="border-b border-[var(--border-color)] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold text-[var(--text-primary)]">
                <MessageSquareText className="h-5 w-5 text-[var(--accent-secondary)]" />
                {problem?.title || "Interview Session"}
                {problem?.difficulty && (
                  <span className={clsx("text-sm font-semibold", difficultyColor)}>
                    ({problem.difficulty})
                  </span>
                )}
              </h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Talk through your approach. The interviewer will guide with follow-up questions and hints.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isActive && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary text-xs"
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
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Comparing...</>
                    ) : (
                      <><Scale className="h-3.5 w-3.5" /> Compare</>
                    )}
                  </button>
                  {!showEndConfirm ? (
                    <button
                      type="button"
                      className="btn btn-secondary text-xs border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                      onClick={() => setShowEndConfirm(true)}
                      disabled={endMutation.isPending}
                    >
                      <Square className="h-3.5 w-3.5" /> End
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/5 px-2 py-1">
                      <span className="text-[11px] text-rose-200 mr-1">End session?</span>
                      <button
                        type="button"
                        className="rounded px-2 py-0.5 text-[11px] font-medium bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 transition"
                        onClick={() => { endMutation.mutate("completed"); setShowEndConfirm(false); }}
                        disabled={endMutation.isPending}
                      >
                        {endMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Complete"}
                      </button>
                      <button
                        type="button"
                        className="rounded px-2 py-0.5 text-[11px] font-medium bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 transition"
                        onClick={() => { endMutation.mutate("abandoned"); setShowEndConfirm(false); }}
                        disabled={endMutation.isPending}
                      >
                        Abandon
                      </button>
                      <button
                        type="button"
                        className="rounded px-1.5 py-0.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                        onClick={() => setShowEndConfirm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Stage stepper */}
          <div className="mt-3">
            <StageStepper current={currentStage} />
          </div>
        </div>

        {/* Scoring panel (shown when session is completed) */}
        {!isActive && scoring && (
          <div className="border-b border-[var(--border-color)] p-4 sm:p-5">
            <ScoringPanel scoring={scoring} duration={sessionDuration} />
          </div>
        )}

        {/* Chat area */}
        <div className="max-h-[55vh] space-y-3 overflow-y-auto p-4 sm:p-5">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquareText className="h-10 w-10 text-[var(--text-muted)]/30 mb-3" />
              <p className="text-sm text-[var(--text-muted)]">No conversation yet. Start by explaining your approach.</p>
            </div>
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

          {respondMutation.isPending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2.5">
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-muted)]" style={{ animationDelay: "0ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-muted)]" style={{ animationDelay: "150ms" }} />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-muted)]" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-[var(--text-muted)]">Interviewer is thinking...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Code snapshot */}
        {isActive && (
          <div className="border-t border-[var(--border-color)] p-4 sm:p-5">
            <details className="group">
              <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]">
                <Code2 className="h-4 w-4" />
                Code Snapshot
                <span className="text-xs text-[var(--text-muted)]">(save your solution progress)</span>
              </summary>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    value={codeLang}
                    onChange={(e) => setCodeLang(e.target.value)}
                    className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-2 py-1 text-xs text-[var(--text-secondary)]"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                    <option value="typescript">TypeScript</option>
                    <option value="go">Go</option>
                    <option value="rust">Rust</option>
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary text-xs"
                    disabled={saveCodeMutation.isPending || !codeValue.trim()}
                    onClick={() => saveCodeMutation.mutate()}
                  >
                    {saveCodeMutation.isPending ? (
                      <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="h-3 w-3" /> Save Snapshot</>
                    )}
                  </button>
                </div>
                <textarea
                  value={codeValue}
                  onChange={(e) => setCodeValue(e.target.value)}
                  placeholder="Paste or type your code here..."
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 font-mono text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)]/40 focus:outline-none min-h-[120px] resize-y"
                />
              </div>
            </details>
          </div>
        )}

        {/* Message input */}
        {isActive && (
          <div className="border-t border-[var(--border-color)] p-4 sm:p-5">
            <MessageInput
              onSend={(message) => respondMutation.mutate(message)}
              disabled={respondMutation.isPending}
            />
          </div>
        )}
      </div>

      {isEndScoreModalOpen && scoring && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={() => setIsEndScoreModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Interview score"
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-[0_30px_60px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] p-5">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
                  <Trophy className="h-5 w-5 text-amber-400" />
                  Interview Result
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Final scoring breakdown for this session.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEndScoreModalOpen(false)}
                className="btn btn-ghost h-9 w-9 rounded-full p-0"
                aria-label="Close interview score modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto p-5">
              <ScoringPanel scoring={scoring} duration={sessionDuration} />
            </div>
          </div>
        </div>
      )}

      {isHistoryScoreModalOpen && historyScoreSessionId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={() => setIsHistoryScoreModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Previous interview score"
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-[0_30px_60px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] p-5">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
                  <History className="h-5 w-5 text-[var(--accent-secondary)]" />
                  Previous Interview Breakdown
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {selectedHistoryItem?.problem?.title || "Interview Session"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryScoreModalOpen(false)}
                className="btn btn-ghost h-9 w-9 rounded-full p-0"
                aria-label="Close previous interview score modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto p-5">
              {historyScoreDetailQuery.isLoading && !selectedHistoryScoring ? (
                <div className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading score...
                </div>
              ) : selectedHistoryScoring ? (
                <ScoringPanel scoring={selectedHistoryScoring} duration={selectedHistoryDuration} />
              ) : (
                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 text-sm text-[var(--text-secondary)]">
                  Score details are not available for this session.
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <Link
                  href={`/interview/${historyScoreSessionId}`}
                  className="btn btn-secondary"
                  onClick={() => setIsHistoryScoreModalOpen(false)}
                >
                  Open Full Session
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCompareModalOpen && latestComparison && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={() => setIsCompareModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Interview complexity comparison"
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-[0_30px_60px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] p-5">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
                  <Scale className="h-5 w-5 text-[var(--accent-secondary)]" />
                  Complexity Comparison
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Compared against your latest code snapshot.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(false)}
                className="btn btn-ghost h-9 w-9 rounded-full p-0"
                aria-label="Close comparison modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[78vh] space-y-4 overflow-y-auto p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${verdictMeta.className}`}>
                  {verdictMeta.label}
                </span>
                <button
                  type="button"
                  onClick={() => compareMutation.mutate()}
                  disabled={compareMutation.isPending || respondMutation.isPending}
                  className="btn btn-secondary"
                >
                  {compareMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Comparing...
                    </>
                  ) : (
                    <>
                      <Scale className="h-4 w-4" />
                      Compare Again
                    </>
                  )}
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-[#c7b79a] bg-[#f7efde] p-3">
                  <p className="text-xs uppercase tracking-wide text-[#7a6440]">Your Complexity</p>
                  <p className="mt-2 text-sm text-[var(--text-primary)]">Time: <span className="font-semibold">{latestComparison.userComplexity.time}</span></p>
                  <p className="text-sm text-[var(--text-primary)]">Space: <span className="font-semibold">{latestComparison.userComplexity.space}</span></p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">Confidence: {Math.round((latestComparison.userComplexity.confidence || 0) * 100)}%</p>
                </div>

                <div className="rounded-lg border border-[#bda7c9] bg-[#f2ebf8] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wide text-[#6f5986]">Optimal Complexity</p>
                    <span className="rounded-full border border-[#bda7c9] bg-[#ebe1f5] px-2 py-0.5 text-[10px] text-[#5f4a73]">
                      {latestComparison.optimalComplexity.source === "problem_data" ? "from problem" : "from AI"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-primary)]">Time: <span className="font-semibold">{latestComparison.optimalComplexity.time}</span></p>
                  <p className="text-sm text-[var(--text-primary)]">Space: <span className="font-semibold">{latestComparison.optimalComplexity.space}</span></p>
                </div>
              </div>

              {latestComparison.comparison.summary && (
                <p className="text-sm text-[var(--text-secondary)]">{latestComparison.comparison.summary}</p>
              )}
              {latestComparison.comparison.recommendation && (
                <p className="text-xs text-[var(--text-muted)]">Recommendation: {latestComparison.comparison.recommendation}</p>
              )}

              <div className="flex items-center justify-end border-t border-[var(--border-color)] pt-3">
                <button
                  type="button"
                  onClick={() => setIsCompareModalOpen(false)}
                  className="btn btn-ghost"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
