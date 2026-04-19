"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Star, MessageSquare, TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import { DifficultyBadge } from "@/src/components/ui/Badge";
import { ProblemViewItem } from "./types";

type Props = {
  problem: ProblemViewItem;
  index: number;
  onToggleSolved: (problemId: string) => void;
  onToggleFavorite: (problemId: string) => void;
};

export default function ProblemRow({ problem, index, onToggleSolved, onToggleFavorite }: Props) {
  const acceptanceColor =
    problem.acceptance >= 60 ? "bg-emerald-500" :
    problem.acceptance >= 40 ? "bg-amber-500" : "bg-rose-500";

  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: Math.min(index * 0.015, 0.15) }}
      className={clsx(
        "group border-b border-[var(--border-color)] transition-all duration-200",
        problem.solved
          ? "bg-[#ecf5e8] hover:bg-[#e3f0dc]"
          : "hover:bg-[#f2e8d8]"
      )}
    >
      <td className="px-3 py-3.5 text-center">
        <button
          type="button"
          onClick={() => onToggleFavorite(problem.id)}
          className="rounded-full p-1 text-[var(--text-muted)] transition hover:text-[#b07f2f] hover:scale-110"
          aria-label={`Toggle favorite for ${problem.title}`}
        >
          <Star className={clsx("h-4 w-4 transition-all", problem.favorite && "fill-[#c69039] text-[#c69039]")} />
        </button>
      </td>

      <td className="px-3 py-3.5">
        <button
          type="button"
          onClick={() => onToggleSolved(problem.id)}
          className="inline-flex rounded-full p-1"
          aria-label={`Toggle solved status for ${problem.title}`}
        >
          {problem.solved ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <Circle className="h-5 w-5 text-[var(--text-muted)] transition group-hover:text-[var(--text-primary)]/70" />
          )}
        </button>
      </td>

      <td className="px-3 py-3.5 text-sm font-mono text-[var(--text-muted)]">{problem.problemId}</td>

      <td className="px-3 py-3.5">
        <Link
          href={`/problems/${problem.slug}`}
          className="font-medium text-[var(--text-primary)] transition hover:text-[var(--accent-muted)]"
        >
          {problem.title}
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {problem.topics.slice(0, 3).map((topic) => (
            <span
              key={topic}
              className="rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
            >
              {topic}
            </span>
          ))}
          {problem.companies.length > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-md border border-[#ccbddf] bg-[#efe8f8] px-1.5 py-0.5 text-[10px] font-medium text-[#7e609f]">
              <TrendingUp className="h-2.5 w-2.5" />
              {problem.companies[0]}
              {problem.companies.length > 1 && ` +${problem.companies.length - 1}`}
            </span>
          )}
        </div>
      </td>

      <td className="px-3 py-3.5">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--border-color)]">
            <div
              className={clsx("h-full rounded-full transition-all duration-500", acceptanceColor)}
              style={{ width: `${Math.min(problem.acceptance, 100)}%` }}
            />
          </div>
          <span className="text-xs font-medium text-[var(--text-secondary)]">{problem.acceptance.toFixed(1)}%</span>
        </div>
      </td>

      <td className="px-3 py-3.5">
        <DifficultyBadge difficulty={problem.difficulty} />
      </td>

      <td className="px-3 py-3.5 text-center">
        <Link
          href={`/problems/${problem.slug}/discuss`}
          className="inline-flex rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] p-1.5 text-[var(--text-muted)] transition hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
          title="Discussions"
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </Link>
      </td>
    </motion.tr>
  );
}
