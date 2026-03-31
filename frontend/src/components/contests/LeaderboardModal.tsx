"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { clsx } from "clsx";
import { Loader2, Target, Timer, Trophy, X } from "lucide-react";
import { LeaderboardEntry } from "@/src/features/contests/contestTypes";

type LeaderboardModalProps = {
  contestTitle: string | null;
  rows: LeaderboardEntry[];
  isOpen: boolean;
  isLoading: boolean;
  isError: boolean;
  currentUserName?: string;
  onClose: () => void;
};

const getMedal = (rank: number) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
};

export default function LeaderboardModal({
  contestTitle,
  rows,
  isOpen,
  isLoading,
  isError,
  currentUserName,
  onClose,
}: LeaderboardModalProps) {
  const sortedRows = useMemo(() => {
    return [...rows].sort(
      (a, b) =>
        b.score - a.score ||
        (b.solved ?? b.score) - (a.solved ?? a.score) ||
        a.penalty - b.penalty ||
        a.name.localeCompare(b.name)
    );
  }, [rows]);

  const normalizedCurrentUser = currentUserName?.trim().toLowerCase();

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] p-5">
              <div>
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <Trophy className="h-5 w-5 text-amber-400" />
                  {contestTitle || "Contest"} Leaderboard
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Ranked by points, solved count, then penalty.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-ghost h-9 w-9 rounded-full p-0"
                aria-label="Close leaderboard"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[62vh] overflow-auto p-5">
              {isLoading ? (
                <div className="flex items-center justify-center py-14 text-[var(--text-secondary)]">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading leaderboard...
                </div>
              ) : isError ? (
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-300">
                  Failed to load leaderboard. Please try again.
                </div>
              ) : sortedRows.length === 0 ? (
                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)]">
                  No submissions yet for this contest.
                </div>
              ) : (
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    <tr>
                      <th className="pb-3">Rank</th>
                      <th className="pb-3">User</th>
                      <th className="pb-3">
                        <span className="inline-flex items-center gap-1">
                          <Trophy className="h-3.5 w-3.5" />
                          Points
                        </span>
                      </th>
                      <th className="pb-3">
                        <span className="inline-flex items-center gap-1">
                          <Target className="h-3.5 w-3.5" />
                          Solved
                        </span>
                      </th>
                      <th className="pb-3">
                        <span className="inline-flex items-center gap-1">
                          <Timer className="h-3.5 w-3.5" />
                          Penalty
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.map((row, index) => {
                      const rank = index + 1;
                      const isCurrentUser = Boolean(
                        normalizedCurrentUser && row.name.toLowerCase() === normalizedCurrentUser
                      );

                      return (
                        <tr
                          key={`${row.userId}-${rank}`}
                          className={clsx(
                            "border-t border-[var(--border-color)]",
                            isCurrentUser && "bg-violet-500/10",
                            rank === 1 && "bg-amber-500/5"
                          )}
                        >
                          <td className="py-3 font-medium">{getMedal(rank)}</td>
                          <td className="py-3">
                            <span className="font-medium text-[var(--text-primary)]">{row.name}</span>
                            {isCurrentUser && (
                              <span className="ml-2 rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">
                                You
                              </span>
                            )}
                          </td>
                          <td className="py-3 font-semibold text-amber-300">{row.score} pts</td>
                          <td className="py-3 text-[var(--text-secondary)]">{row.solved ?? row.score}</td>
                          <td className="py-3 text-[var(--text-secondary)]">{row.penalty}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
