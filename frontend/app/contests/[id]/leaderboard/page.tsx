"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { clsx } from "clsx";
import { Trophy, Medal, ArrowLeft, RefreshCw, Clock, Target } from "lucide-react";
import { contestApi } from "@/src/api/contestApi";
import { CardSkeleton } from "@/src/components/ui/Skeleton";
import ErrorState from "@/src/components/ui/ErrorState";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="h-5 w-5 text-amber-400" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-300" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
  return null;
};

const getRankStyle = (rank: number) => {
  if (rank === 1) return "bg-gradient-to-r from-amber-500/20 to-amber-500/5 border-amber-500/30";
  if (rank === 2) return "bg-gradient-to-r from-slate-400/20 to-slate-400/5 border-slate-400/30";
  if (rank === 3) return "bg-gradient-to-r from-amber-600/20 to-amber-600/5 border-amber-600/30";
  return "";
};

export default function ContestLeaderboardPage() {
  useProtectedRoute();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["leaderboard", id],
    queryFn: async () => (await contestApi.leaderboard(id)).data,
    enabled: Boolean(id),
    refetchInterval: 10000,
  });

  if (isLoading) return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <div className="skeleton mb-2 h-8 w-32" />
        <div className="skeleton h-10 w-48" />
      </div>
      <CardSkeleton />
    </div>
  );

  if (isError) return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <ErrorState message="Failed to load leaderboard" />
    </div>
  );

  const leaderboard = data || [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <Link
          href="/contests"
          className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Contests
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold">
              <Trophy className="h-8 w-8 text-amber-400" />
              Leaderboard
            </h1>
            <p className="mt-1 text-[var(--text-secondary)]">
              {leaderboard.length} participants ranked
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn btn-secondary"
          >
            <RefreshCw className={clsx("h-4 w-4", isFetching && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {leaderboard.length > 0 && (
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {leaderboard.slice(0, 3).map((row: any, index: number) => (
            <div
              key={row.userId}
              className={clsx(
                "card relative overflow-hidden border",
                getRankStyle(index + 1),
                index === 0 && "md:col-start-2 md:row-start-1"
              )}
            >
              <div className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-sm font-bold">
                #{index + 1}
              </div>
              <div className="flex flex-col items-center pt-2 text-center">
                {getRankIcon(index + 1)}
                <div className="mt-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-xl font-bold text-white">
                  {row.name?.charAt(0).toUpperCase()}
                </div>
                <h3 className="mt-3 font-semibold">{row.name}</h3>
                <div className="mt-2 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Target className="h-4 w-4 text-emerald-400" />
                    <span className="font-medium">{row.score}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[var(--text-muted)]">
                    <Clock className="h-4 w-4" />
                    <span>{row.penalty}m</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[var(--border-color)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Participant
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Score
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                Penalty (min)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {leaderboard.map((row: any, index: number) => (
              <tr
                key={row.userId}
                className={clsx(
                  "transition-colors hover:bg-[var(--bg-secondary)]",
                  index < 3 && getRankStyle(index + 1)
                )}
              >
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    {getRankIcon(index + 1)}
                    <span className={clsx(
                      "font-medium",
                      index < 3 && "text-lg"
                    )}>
                      {index + 1}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/50 to-purple-600/50 text-sm font-medium">
                      {row.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{row.name}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-center">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-400">
                    <Target className="h-3.5 w-3.5" />
                    {row.score}
                  </span>
                </td>
                <td className="px-4 py-4 text-center text-[var(--text-secondary)]">
                  {row.penalty}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {leaderboard.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Trophy className="mb-4 h-12 w-12 text-[var(--text-muted)]" />
            <h3 className="text-lg font-semibold">No submissions yet</h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Be the first to solve a problem!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
