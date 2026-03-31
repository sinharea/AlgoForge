"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { clsx } from "clsx";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Loader2,
  PlayCircle,
  RefreshCw,
  Target,
  Timer,
  Trophy,
  Users,
  XCircle,
} from "lucide-react";
import { contestApi } from "@/src/api/contestApi";
import CountdownTimer from "@/src/components/contests/CountdownTimer";
import { DifficultyBadge } from "@/src/components/ui/Badge";
import ErrorState from "@/src/components/ui/ErrorState";
import { CardSkeleton } from "@/src/components/ui/Skeleton";
import { formatCountdown, getContestStatus } from "@/src/features/contests/contestUtils";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";

type ApiContestProblem = {
  _id: string;
  title: string;
  slug: string;
  difficulty: string;
  questionNumber?: number;
  points?: number;
  myStats?: {
    attempts?: number;
    solved?: boolean;
    lastVerdict?: string | null;
    lastSubmittedAt?: string | null;
  };
};

type ApiContest = {
  _id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  duration: number;
  state: "upcoming" | "running" | "ended";
  problems: ApiContestProblem[];
  participantsCount: number;
};

type ApiContestMe = {
  isRegistered: boolean;
  points: number;
  solvedCount: number;
  attemptedCount: number;
  totalSubmissions: number;
  currentRank: number | null;
  totalParticipants: number;
};

type ApiLeaderboardRow = {
  userId: string;
  name: string;
  score: number;
  solved?: number;
  penalty: number;
};

type ApiContestDetailResponse = {
  contest: ApiContest;
  me: ApiContestMe;
  leaderboard: ApiLeaderboardRow[];
};

const getApiErrorMessage = (error: unknown, fallbackMessage: string): string => {
  const maybeError = error as {
    response?: {
      data?: {
        error?: { message?: string };
        message?: string;
      };
    };
  };

  return (
    maybeError?.response?.data?.error?.message ||
    maybeError?.response?.data?.message ||
    fallbackMessage
  );
};

const getStatusBadgeClass = (status: "upcoming" | "live" | "past") => {
  if (status === "upcoming") return "bg-amber-500/15 text-amber-300 border-amber-500/25";
  if (status === "live") return "bg-emerald-500/15 text-emerald-300 border-emerald-500/25";
  return "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-color)]";
};

const getStatusLabel = (status: "upcoming" | "live" | "past") => {
  if (status === "upcoming") return "Upcoming";
  if (status === "live") return "Live";
  return "Ended";
};

const getProblemState = (problem: ApiContestProblem) => {
  const solved = Boolean(problem.myStats?.solved);
  const attempts = problem.myStats?.attempts || 0;

  if (solved) {
    return {
      label: "Solved",
      tone: "success" as const,
    };
  }

  if (attempts > 0) {
    return {
      label: "Attempted",
      tone: "warning" as const,
    };
  }

  return {
    label: "Unattempted",
    tone: "neutral" as const,
  };
};

export default function ContestDetailPage() {
  const { user, ready } = useProtectedRoute();
  const { id } = useParams<{ id: string }>();
  const [now, setNow] = useState(() => Date.now());

  const detailQuery = useQuery({
    queryKey: ["contest-detail", id],
    queryFn: async () => (await contestApi.detail(id)).data as ApiContestDetailResponse,
    enabled: ready && Boolean(id),
    refetchInterval: 10000,
  });

  const registerMutation = useMutation({
    mutationFn: async () => contestApi.register(id),
  });

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const handleRegister = async () => {
    try {
      await registerMutation.mutateAsync();
      await detailQuery.refetch();
      toast.success("Registered successfully!");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to register for contest"));
    }
  };

  if (!ready || detailQuery.isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <div className="skeleton mb-2 h-7 w-48" />
          <div className="skeleton h-11 w-80" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <ErrorState message="Failed to load contest details" onRetry={() => detailQuery.refetch()} />
      </div>
    );
  }

  const { contest, me, leaderboard } = detailQuery.data;
  const startTime = new Date(contest.startTime).getTime();
  const endTime = new Date(contest.endTime).getTime();
  const contestStatus = getContestStatus(
    { startTime, endTime, duration: contest.duration },
    now
  );

  const totalDurationMs = Math.max(endTime - startTime, 1);
  const elapsedMs = Math.min(Math.max(now - startTime, 0), totalDurationMs);
  const progress = Math.round((elapsedMs / totalDurationMs) * 100);
  const currentUserId = user?.id || "";
  const sortedLeaderboard = [...leaderboard].sort(
    (a, b) =>
      b.score - a.score ||
      (b.solved ?? b.score) - (a.solved ?? a.score) ||
      a.penalty - b.penalty ||
      a.name.localeCompare(b.name)
  );

  const myRank =
    me.currentRank ||
    (() => {
      const myIndex = sortedLeaderboard.findIndex((entry) => entry.userId === currentUserId);
      return myIndex >= 0 ? myIndex + 1 : null;
    })();

  const firstProblemToOpen =
    contest.problems.find((problem) => !problem.myStats?.solved) || contest.problems[0] || null;

  const buildProblemHref = (problemSlug: string) => {
    if (contestStatus === "live" && me.isRegistered) {
      const query = new URLSearchParams({
        contestId: contest._id,
        contestTitle: contest.title,
      });
      return `/problems/${problemSlug}?${query.toString()}`;
    }

    return `/problems/${problemSlug}`;
  };

  let timeInfo = "Contest ended";
  if (contestStatus === "upcoming") {
    timeInfo = `Starts in ${formatCountdown(Math.max(startTime - now, 0))}`;
  } else if (contestStatus === "live") {
    timeInfo = `Ends in ${formatCountdown(Math.max(endTime - now, 0))}`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-5">
        <Link
          href="/contests"
          className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Contests
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[linear-gradient(120deg,rgba(139,92,246,0.2),rgba(16,185,129,0.1))] p-6 sm:p-8">
        <div className="absolute inset-0 grid-pattern opacity-50" />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className={clsx("badge border", getStatusBadgeClass(contestStatus))}>
                {getStatusLabel(contestStatus)}
              </span>
              <span className="badge border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                <Users className="mr-1 h-3.5 w-3.5" />
                {me.totalParticipants} participants
              </span>
            </div>
            <h1 className="text-3xl font-bold sm:text-4xl">{contest.title}</h1>
            {contest.description && (
              <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)] sm:text-base">
                {contest.description}
              </p>
            )}
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Clock3 className="h-4 w-4" />
              {timeInfo}
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <CountdownTimer
              contest={{
                startTime,
                endTime,
                duration: contest.duration,
                status: contestStatus,
              }}
              now={now}
            />

            {!me.isRegistered && contestStatus !== "past" && (
              <button
                type="button"
                onClick={handleRegister}
                disabled={registerMutation.isPending}
                className="btn btn-primary"
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  "Register for Contest"
                )}
              </button>
            )}

            {me.isRegistered && firstProblemToOpen?.slug && (
              <Link href={buildProblemHref(firstProblemToOpen.slug)} className="btn btn-success">
                <PlayCircle className="h-4 w-4" />
                {contestStatus === "live" ? "Continue Solving" : "View Problems"}
              </Link>
            )}

            <button
              type="button"
              onClick={() => detailQuery.refetch()}
              disabled={detailQuery.isFetching}
              className="btn btn-secondary"
            >
              <RefreshCw className={clsx("h-4 w-4", detailQuery.isFetching && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>

        {contestStatus === "live" && (
          <div className="relative z-10 mt-5">
            <div className="mb-1.5 flex items-center justify-between text-xs text-emerald-300">
              <span>Round Progress</span>
              <span>{progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="h-full rounded-full bg-emerald-400" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="card">
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Points</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-300">
            {me.points}
            <span className="ml-1 text-sm text-[var(--text-secondary)]">pts</span>
          </p>
        </article>

        <article className="card">
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Solved</p>
          <p className="mt-1 text-2xl font-semibold">{me.solvedCount}</p>
        </article>

        <article className="card">
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Current Rank</p>
          <p className="mt-1 text-2xl font-semibold text-amber-300">
            {myRank ? `#${myRank}` : "Not ranked"}
          </p>
        </article>

        <article className="card">
          <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Attempted</p>
          <p className="mt-1 text-2xl font-semibold">{me.attemptedCount}</p>
        </article>
      </section>

      <section className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
            <h2 className="text-lg font-semibold">Contest Problems</h2>
            <span className="text-sm text-[var(--text-secondary)]">{contest.problems.length} total</span>
          </div>

          {contest.problems.length === 0 ? (
            <div className="px-5 py-10 text-sm text-[var(--text-secondary)]">
              No questions assigned yet. Ask an admin to update the contest problems.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-color)]">
              {contest.problems.map((problem) => {
                const problemState = getProblemState(problem);
                const attempts = problem.myStats?.attempts || 0;
                const lastSubmission = problem.myStats?.lastSubmittedAt;

                return (
                  <div key={problem._id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-[var(--text-muted)]">
                        Q{problem.questionNumber || "-"}
                      </p>
                      <h3 className="font-medium">{problem.title}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <DifficultyBadge difficulty={problem.difficulty} />
                        <span className="badge border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                          {problem.points || 0} pts
                        </span>
                        <span
                          className={clsx(
                            "badge",
                            problemState.tone === "success" && "badge-success",
                            problemState.tone === "warning" && "bg-amber-500/15 text-amber-300",
                            problemState.tone === "neutral" && "badge-neutral"
                          )}
                        >
                          {problemState.label}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">
                          Attempts: {attempts}
                        </span>
                        {lastSubmission && (
                          <span className="text-xs text-[var(--text-muted)]">
                            Last: {formatDistanceToNow(new Date(lastSubmission), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {problem.slug ? (
                        <Link href={buildProblemHref(problem.slug)} className="btn btn-secondary">
                          <PlayCircle className="h-4 w-4" />
                          Open Problem
                        </Link>
                      ) : (
                        <button type="button" disabled className="btn btn-secondary">
                          Slug Missing
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="card overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
            <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
              <Trophy className="h-5 w-5 text-amber-400" />
              Live Rank
            </h2>
            <span className="text-sm text-[var(--text-secondary)]">Top {Math.min(sortedLeaderboard.length, 10)}</span>
          </div>

          {sortedLeaderboard.length === 0 ? (
            <div className="px-5 py-10 text-sm text-[var(--text-secondary)]">
              No submissions yet. Submit a solution to get ranked.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-color)]">
              {sortedLeaderboard.slice(0, 10).map((entry, index) => {
                const rank = index + 1;
                const isCurrentUser = entry.userId === currentUserId;
                return (
                  <div
                    key={`${entry.userId}-${rank}`}
                    className={clsx(
                      "flex items-center justify-between px-5 py-3",
                      rank === 1 && "bg-amber-500/5",
                      isCurrentUser && "bg-violet-500/10"
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium">
                        #{rank} {entry.name}
                        {isCurrentUser && (
                          <span className="ml-2 rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">
                            You
                          </span>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">Penalty: {entry.penalty} min</p>
                    </div>
                    <div className="text-right">
                      <p className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-300">
                        <Target className="h-4 w-4" />
                        {entry.score} pts
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{entry.solved ?? 0} solved</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-[var(--border-color)] bg-[var(--bg-primary)] px-5 py-3 text-xs text-[var(--text-secondary)]">
            Ranked by points, then solved count, then penalty.
          </div>
        </article>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        <article className="card flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <div>
            <p className="text-sm font-medium">Solved Problems</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Keep pushing to improve your rank.
            </p>
          </div>
        </article>

        <article className="card flex items-center gap-3">
          <XCircle className="h-5 w-5 text-amber-400" />
          <div>
            <p className="text-sm font-medium">Wrong Attempts</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Each wrong try can increase penalty time.
            </p>
          </div>
        </article>

        <article className="card flex items-center gap-3">
          <Timer className="h-5 w-5 text-violet-300" />
          <div>
            <p className="text-sm font-medium">Clock</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Manage time carefully in the final stretch.
            </p>
          </div>
        </article>
      </section>
    </div>
  );
}
