"use client";

import { motion } from "framer-motion";
import { CalendarX2 } from "lucide-react";
import ContestCard from "./ContestCard";
import { ContestListItem } from "@/src/features/contests/contestTypes";

type ContestListProps = {
  contests: ContestListItem[];
  now: number;
  registeredContestIds: string[];
  registeringContestId: string | null;
  reminderContestIds: string[];
  onRegister: (contestId: string) => void;
  onEnterContest: (contestId: string) => void;
  onToggleReminder: (contestId: string) => void;
  onOpenLeaderboard: (contestId: string) => void;
};

export default function ContestList({
  contests,
  now,
  registeredContestIds,
  registeringContestId,
  reminderContestIds,
  onRegister,
  onEnterContest,
  onToggleReminder,
  onOpenLeaderboard,
}: ContestListProps) {
  if (!contests.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="mb-4 rounded-full bg-[var(--bg-tertiary)] p-4">
          <CalendarX2 className="h-8 w-8 text-[var(--text-muted)]" />
        </div>
        <h3 className="text-lg font-semibold">No contests available</h3>
        <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
          Try another filter or check back soon for the next coding battle.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {contests.map((contest, index) => (
        <motion.div
          key={contest.id}
          layout
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.2) }}
        >
          <ContestCard
            contest={contest}
            now={now}
            isRegistered={registeredContestIds.includes(contest.id)}
            isRegistering={registeringContestId === contest.id}
            reminderEnabled={reminderContestIds.includes(contest.id)}
            onRegister={onRegister}
            onEnterContest={onEnterContest}
            onToggleReminder={onToggleReminder}
            onOpenLeaderboard={onOpenLeaderboard}
          />
        </motion.div>
      ))}
    </div>
  );
}
