"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";
import {
  Bell,
  BellOff,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  PlayCircle,
  Trophy,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import CountdownTimer from "./CountdownTimer";
import { ContestListItem, ContestStatus } from "@/src/features/contests/contestTypes";
import { getContestEndTime } from "@/src/features/contests/contestUtils";

type ContestCardProps = {
  contest: ContestListItem;
  now: number;
  isRegistered: boolean;
  isRegistering: boolean;
  reminderEnabled: boolean;
  onRegister: (contestId: string) => void;
  onEnterContest: (contestId: string) => void;
  onToggleReminder: (contestId: string) => void;
  onOpenLeaderboard: (contestId: string) => void;
};

const statusMeta: Record<ContestStatus, { emoji: string; label: string; className: string }> = {
  upcoming: {
    emoji: "🟡",
    label: "Upcoming",
    className: "bg-amber-500/10 text-amber-300",
  },
  live: {
    emoji: "🟢",
    label: "Live",
    className: "bg-emerald-500/10 text-emerald-300",
  },
  past: {
    emoji: "⚫",
    label: "Past",
    className: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
  },
};

export default function ContestCard({
  contest,
  now,
  isRegistered,
  isRegistering,
  reminderEnabled,
  onRegister,
  onEnterContest,
  onToggleReminder,
  onOpenLeaderboard,
}: ContestCardProps) {
  const [expandedProblems, setExpandedProblems] = useState(false);

  const endTime = getContestEndTime(contest);
  const totalDurationMs = Math.max(endTime - contest.startTime, 1);
  const elapsedMs = Math.max(0, now - contest.startTime);
  const progress = Math.max(0, Math.min(100, Math.round((elapsedMs / totalDurationMs) * 100)));

  const visibleProblems = expandedProblems ? contest.problems : contest.problems.slice(0, 4);
  const hiddenProblemCount = Math.max(contest.problems.length - 4, 0);
  const participantsCount = contest.participants.length;
  const meta = statusMeta[contest.status];

  return (
    <motion.article
      layout
      whileHover={{ y: -4, scale: 1.005 }}
      transition={{ duration: 0.22 }}
      className={clsx(
        "card relative overflow-hidden",
        contest.status === "live" && "border-emerald-500/40 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]"
      )}
    >
      {contest.status === "live" && (
        <div className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          LIVE NOW
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-lg font-semibold">{contest.title}</h3>
              <span className={clsx("badge gap-1.5", meta.className)}>
                <span>{meta.emoji}</span>
                {meta.label}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-4 w-4" />
                {format(contest.startTime, "MMM d, yyyy • h:mm a")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" />
                {contest.duration} min
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {participantsCount.toLocaleString()} registered
              </span>
            </div>
          </div>
          <CountdownTimer contest={contest} now={now} />
        </div>

        {contest.status === "live" && (
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-emerald-300">
              <span>Round progress</span>
              <span>{progress}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            {contest.problems.length} problems · Ends {format(endTime, "h:mm a")}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {visibleProblems.map((problem) => (
              <span
                key={problem.id}
                className="badge border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
              >
                {problem.title}
              </span>
            ))}
            {hiddenProblemCount > 0 && (
              <button
                type="button"
                onClick={() => setExpandedProblems((prev) => !prev)}
                className="badge border border-[var(--border-color)] bg-transparent text-[var(--text-secondary)] transition hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
              >
                {expandedProblems ? "Show less" : `+${hiddenProblemCount} more`}
              </button>
            )}
            {contest.problems.length === 0 && (
              <span className="text-sm text-[var(--text-muted)]">Problems will be announced soon.</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {contest.status === "upcoming" && (
            <button
              type="button"
              disabled={isRegistered || isRegistering}
              onClick={() => onRegister(contest.id)}
              className={clsx("btn", isRegistered ? "btn-secondary" : "btn-primary")}
            >
              {isRegistering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : isRegistered ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Registered ✅
                </>
              ) : (
                "Register"
              )}
            </button>
          )}

          {contest.status === "live" && (
            <button
              type="button"
              disabled={isRegistering}
              onClick={() => onEnterContest(contest.id)}
              className="btn btn-success"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" />
                  {isRegistered ? "Enter Contest" : "Register & Enter"}
                </>
              )}
            </button>
          )}

          {contest.status === "upcoming" && (
            <button
              type="button"
              onClick={() => onToggleReminder(contest.id)}
              className="btn btn-secondary"
            >
              {reminderEnabled ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              {reminderEnabled ? "Reminder On" : "Set Reminder"}
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenLeaderboard(contest.id)}
            className="btn btn-secondary"
          >
            <Trophy className="h-4 w-4" />
            Leaderboard
          </button>
        </div>
      </div>
    </motion.article>
  );
}
