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
        "group border-b border-white/5 transition-all duration-200",
        problem.solved
          ? "bg-emerald-500/[0.03] hover:bg-emerald-500/[0.07]"
          : "hover:bg-cyan-400/[0.04]"
      )}
    >
      <td className="px-3 py-3.5 text-center">
        <button
          type="button"
          onClick={() => onToggleFavorite(problem.id)}
          className="rounded-full p-1 text-[var(--text-muted)] transition hover:text-amber-300 hover:scale-110"
          aria-label={`Toggle favorite for ${problem.title}`}
        >
          <Star className={clsx("h-4 w-4 transition-all", problem.favorite && "fill-amber-300 text-amber-300 drop-shadow-[0_0_4px_rgba(252,211,77,0.5)]")} />
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
            <CheckCircle2 className="h-5 w-5 text-emerald-400 drop-shadow-[0_0_3px_rgba(52,211,153,0.4)]" />
          ) : (
            <Circle className="h-5 w-5 text-[var(--text-muted)] transition group-hover:text-cyan-300/60" />
          )}
        </button>
      </td>

      <td className="px-3 py-3.5 text-sm font-mono text-[var(--text-muted)]">{problem.problemId}</td>

      <td className="px-3 py-3.5">
        <Link
          href={`/problems/${problem.slug}`}
          className="font-medium text-[var(--text-primary)] transition hover:text-cyan-300"
        >
          {problem.title}
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {problem.topics.slice(0, 3).map((topic) => (
            <span
              key={topic}
              className="rounded-md border border-white/8 bg-[var(--bg-secondary)]/80 px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)] transition-colors hover:border-cyan-500/30 hover:text-cyan-300/80"
            >
              {topic}
            </span>
          ))}
          {problem.companies.length > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-md border border-violet-500/20 bg-violet-500/8 px-1.5 py-0.5 text-[10px] font-medium text-violet-300/80">
              <TrendingUp className="h-2.5 w-2.5" />
              {problem.companies[0]}
              {problem.companies.length > 1 && ` +${problem.companies.length - 1}`}
            </span>
          )}
        </div>
      </td>

      <td className="px-3 py-3.5">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
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
          className="inline-flex rounded-full border border-white/8 bg-[var(--bg-secondary)]/60 p-1.5 text-[var(--text-muted)] transition hover:border-cyan-500/30 hover:text-cyan-300"
          title="Discussions"
        >
          <MessageSquare className="h-3.5 w-3.5" />
        </Link>
      </td>
    </motion.tr>
  );
}
