"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import toast from "react-hot-toast";
import { clsx } from "clsx";
import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";
import {
  Trophy,
  Calendar,
  Clock,
  Users,
  ChevronRight,
  Play,
  CheckCircle2,
  Timer,
  Award,
  Loader2,
} from "lucide-react";
import { contestApi } from "@/src/api/contestApi";
import { CardSkeleton } from "@/src/components/ui/Skeleton";
import ErrorState from "@/src/components/ui/ErrorState";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";
import { useState } from "react";

const getStateInfo = (state: string) => {
  switch (state) {
    case "running":
      return { label: "Live", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: Play, dot: "status-dot-success" };
    case "upcoming":
      return { label: "Upcoming", color: "text-amber-400", bg: "bg-amber-500/10", icon: Timer, dot: "status-dot-warning" };
    case "ended":
      return { label: "Ended", color: "text-[var(--text-muted)]", bg: "bg-[var(--bg-tertiary)]", icon: CheckCircle2, dot: "" };
    default:
      return { label: state, color: "text-[var(--text-secondary)]", bg: "bg-[var(--bg-tertiary)]", icon: Trophy, dot: "" };
  }
};

export default function ContestsPage() {
  useProtectedRoute();
  const [registering, setRegistering] = useState<string | null>(null);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["contests"],
    queryFn: async () => (await contestApi.list()).data,
  });

  const handleRegister = async (contestId: string) => {
    setRegistering(contestId);
    try {
      await contestApi.register(contestId);
      toast.success("Successfully registered for contest!");
      refetch();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to register");
    } finally {
      setRegistering(null);
    }
  };

  if (isLoading) return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <div className="skeleton mb-2 h-10 w-40" />
        <div className="skeleton h-5 w-72" />
      </div>
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  );

  if (isError) return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <ErrorState message="Failed to load contests" />
    </div>
  );

  const contests = data || [];
  const liveContests = contests.filter((c: any) => c.state === "running");
  const upcomingContests = contests.filter((c: any) => c.state === "upcoming");
  const pastContests = contests.filter((c: any) => c.state === "ended");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Contests</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Compete with others and test your skills in timed challenges
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-secondary)] px-4 py-2 text-sm">
          <Trophy className="h-4 w-4 text-[var(--accent-secondary)]" />
          <span>All: {contests.length}</span>
        </div>
        {liveContests.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
            <div className="status-dot status-dot-success" />
            <span>Live: {liveContests.length}</span>
          </div>
        )}
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
          <Timer className="h-4 w-4" />
          <span>Upcoming: {upcomingContests.length}</span>
        </div>
      </div>

      {liveContests.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <div className="status-dot status-dot-success" />
            Live Now
          </h2>
          <div className="space-y-4">
            {liveContests.map((contest: any) => (
              <ContestCard
                key={contest._id}
                contest={contest}
                onRegister={handleRegister}
                registering={registering}
              />
            ))}
          </div>
        </section>
      )}

      {upcomingContests.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <Timer className="h-5 w-5 text-amber-400" />
            Upcoming Contests
          </h2>
          <div className="space-y-4">
            {upcomingContests.map((contest: any) => (
              <ContestCard
                key={contest._id}
                contest={contest}
                onRegister={handleRegister}
                registering={registering}
              />
            ))}
          </div>
        </section>
      )}

      {pastContests.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <CheckCircle2 className="h-5 w-5 text-[var(--text-muted)]" />
            Past Contests
          </h2>
          <div className="space-y-4">
            {pastContests.map((contest: any) => (
              <ContestCard
                key={contest._id}
                contest={contest}
                onRegister={handleRegister}
                registering={registering}
              />
            ))}
          </div>
        </section>
      )}

      {contests.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-[var(--bg-tertiary)] p-4">
            <Trophy className="h-8 w-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold">No contests available</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Check back later for upcoming contests
          </p>
        </div>
      )}
    </div>
  );
}

function ContestCard({
  contest,
  onRegister,
  registering,
}: {
  contest: any;
  onRegister: (id: string) => void;
  registering: string | null;
}) {
  const stateInfo = getStateInfo(contest.state);
  const Icon = stateInfo.icon;
  const startDate = new Date(contest.startTime);
  const endDate = new Date(contest.endTime);
  const isLive = contest.state === "running";
  const isUpcoming = contest.state === "upcoming";

  return (
    <div className={clsx(
      "card card-hover relative overflow-hidden",
      isLive && "border-emerald-500/50"
    )}>
      {isLive && (
        <div className="absolute right-0 top-0 rounded-bl-xl bg-emerald-500/20 px-3 py-1">
          <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <div className="status-dot status-dot-success" />
            LIVE
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-3">
            <h3 className="text-lg font-semibold">{contest.title}</h3>
            <span className={clsx("badge", stateInfo.bg, stateInfo.color)}>
              <Icon className="mr-1 h-3 w-3" />
              {stateInfo.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-secondary)]">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {format(startDate, "MMM d, yyyy 'at' h:mm a")}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {contest.duration} min
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {contest.participants?.length || 0} registered
            </div>
          </div>

          {isUpcoming && (
            <p className="mt-2 text-sm text-amber-400">
              Starts {formatDistanceToNow(startDate, { addSuffix: true })}
            </p>
          )}

          {contest.problems?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {contest.problems.slice(0, 3).map((p: any, idx: number) => (
                <span key={idx} className="badge badge-neutral text-xs">
                  {p.title || `Problem ${idx + 1}`}
                </span>
              ))}
              {contest.problems.length > 3 && (
                <span className="text-xs text-[var(--text-muted)]">
                  +{contest.problems.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(isLive || isUpcoming) && (
            <button
              onClick={() => onRegister(contest._id)}
              disabled={registering === contest._id}
              className={clsx(
                "btn",
                isLive ? "btn-success" : "btn-primary"
              )}
            >
              {registering === contest._id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  {isLive ? "Join Now" : "Register"}
                </>
              )}
            </button>
          )}
          <Link
            href={`/contests/${contest._id}/leaderboard`}
            className="btn btn-secondary"
          >
            <Award className="h-4 w-4" />
            Leaderboard
          </Link>
        </div>
      </div>
    </div>
  );
}
