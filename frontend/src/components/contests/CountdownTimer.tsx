"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Clock3 } from "lucide-react";
import { clsx } from "clsx";
import { ContestListItem } from "@/src/features/contests/contestTypes";
import { getContestTimeDisplay } from "@/src/features/contests/contestUtils";

type CountdownTimerProps = {
  contest: Pick<ContestListItem, "startTime" | "endTime" | "duration" | "status">;
  now: number;
  className?: string;
};

const toneClassMap = {
  warning: "border-amber-500/25 bg-amber-500/10 text-amber-300",
  success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
  neutral: "border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)]",
};

export default function CountdownTimer({ contest, now, className }: CountdownTimerProps) {
  const display = getContestTimeDisplay(contest, now);

  return (
    <div
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        toneClassMap[display.tone],
        className
      )}
    >
      <Clock3 className="h-3.5 w-3.5" />
      <span>{display.label}</span>
      {display.isPast ? (
        <span className="font-semibold">{display.value}</span>
      ) : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={`${contest.status}-${display.value}`}
            initial={{ y: 4, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -4, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="font-semibold tabular-nums"
          >
            {display.value}
          </motion.span>
        </AnimatePresence>
      )}
    </div>
  );
}
