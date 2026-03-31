"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { clsx } from "clsx";
import { motion } from "framer-motion";
import {
  ArrowDownWideNarrow,
  Flame,
  ListFilter,
  Loader2,
  Trophy,
  Timer,
  Users,
} from "lucide-react";
import ContestList from "@/src/components/contests/ContestList";
import LeaderboardModal from "@/src/components/contests/LeaderboardModal";
import { contestApi } from "@/src/api/contestApi";
import { CardSkeleton } from "@/src/components/ui/Skeleton";
import ErrorState from "@/src/components/ui/ErrorState";
import {
  ContestListItem,
  ContestParticipant,
  ContestStatus,
  LeaderboardEntry,
} from "@/src/features/contests/contestTypes";
import { getContestStatus } from "@/src/features/contests/contestUtils";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";

type ContestFilter = "all" | "upcoming" | "live" | "past";
type ContestSort = "startTime" | "popularity" | "duration";

const REMINDER_STORAGE_KEY = "algoforge.reminder-contests";
const PAGE_SIZE = 4;

type ApiContestProblem = {
  _id: string;
  title: string;
  slug: string;
  difficulty: string;
};

type ApiContestParticipant = {
  user?: string | { _id?: string };
  joinedAt?: string;
};

type ApiContest = {
  _id: string;
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  state?: "upcoming" | "running" | "ended";
  problems?: ApiContestProblem[];
  participants?: ApiContestParticipant[];
};

type ApiLeaderboardRow = {
  userId: string;
  name: string;
  score: number;
  solved?: number;
  penalty: number;
};

const FILTER_OPTIONS: Array<{ value: ContestFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "live", label: "Live" },
  { value: "past", label: "Past" },
];

const SORT_OPTIONS: Array<{ value: ContestSort; label: string }> = [
  { value: "startTime", label: "Start Time" },
  { value: "popularity", label: "Popularity" },
  { value: "duration", label: "Duration" },
];

const getParticipantUserId = (participant: ApiContestParticipant): string => {
  if (!participant.user) {
    return "";
  }

  if (typeof participant.user === "string") {
    return participant.user;
  }

  return participant.user._id || "";
};

const mapContest = (contest: ApiContest, now: number): ContestListItem => {
  const startTime = new Date(contest.startTime).getTime();
  const endTime = new Date(contest.endTime).getTime();
  const fallbackDuration = Math.max(1, Math.round((endTime - startTime) / (60 * 1000)));
  const duration = contest.duration || fallbackDuration;
  const participants: ContestParticipant[] = (contest.participants || []).map((participant) => ({
    userId: getParticipantUserId(participant),
    joinedAt: participant.joinedAt,
  }));

  return {
    id: contest._id,
    title: contest.title,
    startTime,
    endTime,
    duration,
    problems: (contest.problems || []).map((problem) => ({
      id: problem._id,
      title: problem.title,
      slug: problem.slug,
      difficulty: problem.difficulty,
    })),
    participants,
    status: getContestStatus({ startTime, endTime, duration }, now),
  };
};

const parseStoredIds = (rawValue: string | null): string[] => {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
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

const sortContests = (contests: ContestListItem[], sortBy: ContestSort): ContestListItem[] => {
  const next = [...contests];

  if (sortBy === "startTime") {
    return next.sort((a, b) => a.startTime - b.startTime);
  }

  if (sortBy === "duration") {
    return next.sort((a, b) => b.duration - a.duration);
  }

  return next.sort((a, b) => b.participants.length - a.participants.length);
};

export default function ContestsPage() {
  const { user, ready } = useProtectedRoute();
  const router = useRouter();

  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState<ContestFilter>("all");
  const [sortBy, setSortBy] = useState<ContestSort>("startTime");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [registeringContestId, setRegisteringContestId] = useState<string | null>(null);
  const [reminderContestIds, setReminderContestIds] = useState<string[]>([]);
  const [selectedContestId, setSelectedContestId] = useState<string | null>(null);
  const previousStatusRef = useRef<Record<string, ContestStatus>>({});

  const contestsQuery = useQuery({
    queryKey: ["contests"],
    queryFn: async () => (await contestApi.list()).data as ApiContest[],
    enabled: ready,
  });

  const leaderboardQuery = useQuery({
    queryKey: ["contest-leaderboard", selectedContestId],
    queryFn: async () => (await contestApi.leaderboard(selectedContestId!)).data as ApiLeaderboardRow[],
    enabled: Boolean(selectedContestId),
  });

  const registerMutation = useMutation({
    mutationFn: async (contestId: string) => contestApi.register(contestId),
  });

  useEffect(() => {
    setReminderContestIds(parseStoredIds(window.localStorage.getItem(REMINDER_STORAGE_KEY)));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(reminderContestIds));
  }, [reminderContestIds]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const contests = useMemo(
    () => (contestsQuery.data || []).map((contest) => mapContest(contest, now)),
    [contestsQuery.data, now]
  );

  useEffect(() => {
    if (!contests.length) {
      previousStatusRef.current = {};
      return;
    }

    const currentStatusMap: Record<string, ContestStatus> = {};

    contests.forEach((contest) => {
      currentStatusMap[contest.id] = contest.status;
      const previousStatus = previousStatusRef.current[contest.id];

      if (!previousStatus || previousStatus === contest.status) {
        return;
      }

      if (previousStatus === "upcoming" && contest.status === "live") {
        const isReminderEnabled = reminderContestIds.includes(contest.id);
        toast.success(
          isReminderEnabled
            ? `${contest.title} is live now. Time to code!`
            : `${contest.title} is now LIVE!`
        );
      }

      if (previousStatus === "live" && contest.status === "past") {
        toast(`${contest.title} has ended`, { icon: "🏁" });
      }
    });

    previousStatusRef.current = currentStatusMap;
  }, [contests, reminderContestIds]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter, sortBy]);

  const currentUserId = useMemo(() => {
    const safeUser = user as { id?: string; _id?: string } | null;
    return safeUser?.id || safeUser?._id || "";
  }, [user]);

  const isContestRegistered = useCallback(
    (contest: ContestListItem) =>
      contest.participants.some((participant) => participant.userId === currentUserId),
    [currentUserId]
  );

  const registeredContestIds = useMemo(
    () => contests.filter((contest) => isContestRegistered(contest)).map((contest) => contest.id),
    [contests, isContestRegistered]
  );

  const filteredContests = useMemo(() => {
    const byFilter =
      filter === "all"
        ? contests
        : contests.filter((contest) => contest.status === filter);

    return sortContests(byFilter, sortBy);
  }, [contests, filter, sortBy]);

  const visibleContests = useMemo(
    () => filteredContests.slice(0, visibleCount),
    [filteredContests, visibleCount]
  );

  const stats = useMemo(() => {
    const live = contests.filter((contest) => contest.status === "live").length;
    const upcoming = contests.filter((contest) => contest.status === "upcoming").length;
    const past = contests.filter((contest) => contest.status === "past").length;

    return {
      all: contests.length,
      live,
      upcoming,
      past,
    };
  }, [contests]);

  const getFilterCount = (value: ContestFilter) => {
    if (value === "all") return stats.all;
    if (value === "live") return stats.live;
    if (value === "upcoming") return stats.upcoming;
    return stats.past;
  };

  const selectedContest = useMemo(
    () => contests.find((contest) => contest.id === selectedContestId) ?? null,
    [contests, selectedContestId]
  );

  const leaderboardRows = useMemo(
    () =>
      (leaderboardQuery.data || []).map((row) => ({
        userId: row.userId,
        name: row.name,
        score: row.score,
        solved: row.solved ?? row.score,
        penalty: row.penalty,
      })) as LeaderboardEntry[],
    [leaderboardQuery.data]
  );

  const hasMore = visibleCount < filteredContests.length;

  const registerContest = async (contestId: string, silentSuccess = false) => {
    const contest = contests.find((item) => item.id === contestId);
    if (!contest) {
      return false;
    }

    if (contest.status === "past") {
      toast.error("This contest is already over.");
      return false;
    }

    if (isContestRegistered(contest)) {
      if (!silentSuccess) {
        toast("Already registered", { icon: "✅" });
      }
      return true;
    }

    setRegisteringContestId(contestId);
    try {
      await registerMutation.mutateAsync(contestId);
      await contestsQuery.refetch();
      if (!silentSuccess) {
        toast.success("Registered successfully!");
      }
      return true;
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Failed to register for contest"));
      return false;
    } finally {
      setRegisteringContestId(null);
    }
  };

  const handleRegister = async (contestId: string) => {
    await registerContest(contestId);
  };

  const handleToggleReminder = (contestId: string) => {
    const alreadyEnabled = reminderContestIds.includes(contestId);

    setReminderContestIds((previous) =>
      alreadyEnabled
        ? previous.filter((item) => item !== contestId)
        : [...previous, contestId]
    );

    toast.success(alreadyEnabled ? "Reminder disabled" : "Reminder set successfully");
  };

  const handleEnterContest = async (contestId: string) => {
    const contest = contests.find((item) => item.id === contestId);
    if (!contest) {
      return;
    }

    if (contest.status !== "live") {
      toast.error("You can enter only when the contest is live.");
      return;
    }

    const isRegistered = await registerContest(contest.id, true);
    if (!isRegistered) {
      return;
    }

    router.push(`/contests/${contest.id}`);
  };

  const handleOpenLeaderboard = (contestId: string) => {
    setSelectedContestId(contestId);
  };

  if (!ready) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-6xl items-center justify-center px-4 py-8 sm:px-6">
        <div className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading contests...
        </div>
      </div>
    );
  }

  if (contestsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <div className="skeleton mb-3 h-12 w-64" />
          <div className="skeleton h-5 w-96" />
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (contestsQuery.isError) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <ErrorState message="Failed to load contests" onRetry={() => contestsQuery.refetch()} />
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[linear-gradient(120deg,rgba(139,92,246,0.18),rgba(16,185,129,0.08))] p-6 sm:p-8"
        >
          <div className="absolute inset-0 grid-pattern opacity-50" />
          <div className="relative z-10">
            <h1 className="text-3xl font-bold sm:text-4xl">Contest Arena</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)] sm:text-base">
              Join weekly rounds, race the countdown, and climb the rankings with live contest states and interactive leaderboards.
            </p>
          </div>
        </motion.section>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="card flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">All Contests</p>
              <p className="mt-1 text-2xl font-semibold">{stats.all}</p>
            </div>
            <Trophy className="h-6 w-6 text-violet-300" />
          </div>
          <div className="card flex items-center justify-between border-emerald-500/30 bg-emerald-500/5 p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-emerald-300">Live</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-200">{stats.live}</p>
            </div>
            <Flame className="h-6 w-6 text-emerald-300" />
          </div>
          <div className="card flex items-center justify-between border-amber-500/30 bg-amber-500/5 p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-300">Upcoming</p>
              <p className="mt-1 text-2xl font-semibold text-amber-200">{stats.upcoming}</p>
            </div>
            <Timer className="h-6 w-6 text-amber-300" />
          </div>
          <div className="card flex items-center justify-between p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Community Registrations</p>
              <p className="mt-1 text-2xl font-semibold">
                {contests
                  .reduce((sum, contest) => sum + contest.participants.length, 0)
                  .toLocaleString()}
              </p>
            </div>
            <Users className="h-6 w-6 text-[var(--accent-secondary)]" />
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
                <ListFilter className="h-4 w-4" />
                Filters
              </span>
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFilter(option.value)}
                  className={clsx(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                    filter === option.value
                      ? "border-violet-400/40 bg-violet-500/15 text-violet-200"
                      : "border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {option.label}
                  <span className="rounded-full bg-black/20 px-2 py-0.5 text-xs">
                    {getFilterCount(option.value)}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <ArrowDownWideNarrow className="h-4 w-4 text-[var(--text-secondary)]" />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as ContestSort)}
                className="input select h-10 min-w-[220px]"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort by {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <ContestList
            contests={visibleContests}
            now={now}
            registeredContestIds={registeredContestIds}
            registeringContestId={registeringContestId}
            reminderContestIds={reminderContestIds}
            onRegister={handleRegister}
            onEnterContest={handleEnterContest}
            onToggleReminder={handleToggleReminder}
            onOpenLeaderboard={handleOpenLeaderboard}
          />

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setVisibleCount((previous) => previous + PAGE_SIZE)}
              >
                Load More Contests
              </button>
            </div>
          )}

          {!hasMore && filteredContests.length > PAGE_SIZE && (
            <p className="mt-4 text-center text-sm text-[var(--text-muted)]">
              All contests loaded
            </p>
          )}
        </div>

        {filter === "all" && stats.all === 0 && (
          <div className="card mt-6 flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-[var(--bg-tertiary)] p-4">
              <Trophy className="h-8 w-8 text-[var(--text-muted)]" />
            </div>
            <h3 className="text-lg font-semibold">No contests available</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              New contests will appear here soon.
            </p>
          </div>
        )}
      </div>

      <LeaderboardModal
        contestTitle={selectedContest?.title || null}
        rows={leaderboardRows}
        isOpen={Boolean(selectedContestId)}
        isLoading={leaderboardQuery.isLoading}
        isError={leaderboardQuery.isError}
        currentUserName={user?.name}
        onClose={() => setSelectedContestId(null)}
      />
    </>
  );
}
