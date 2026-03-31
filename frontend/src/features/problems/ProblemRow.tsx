"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Lock, LockOpen, Star } from "lucide-react";
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
  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
      className="group border-b border-white/5 transition-colors hover:bg-cyan-400/5"
    >
      <td className="px-3 py-3 text-center">
        <button
          type="button"
          onClick={() => onToggleFavorite(problem.id)}
          className="rounded-full p-1 text-[var(--text-muted)] transition hover:text-amber-200"
          aria-label={`Toggle favorite for ${problem.title}`}
        >
          <Star className={clsx("h-4 w-4", problem.favorite && "fill-amber-300 text-amber-300")} />
        </button>
      </td>

      <td className="px-3 py-3">
        <button
          type="button"
          onClick={() => onToggleSolved(problem.id)}
          className="inline-flex rounded-full p-1"
          aria-label={`Toggle solved status for ${problem.title}`}
          title="Toggle solved status"
        >
          {problem.solved ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : (
            <Circle className="h-5 w-5 text-[var(--text-muted)] transition group-hover:text-cyan-200" />
          )}
        </button>
      </td>

      <td className="px-3 py-3 text-sm font-mono text-[var(--text-secondary)]">{problem.problemId}</td>

      <td className="px-3 py-3">
        <Link
          href={`/problems/${problem.slug}`}
          className="font-medium text-[var(--text-primary)] transition hover:text-cyan-200"
        >
          {problem.title}
        </Link>
        <div className="mt-1 flex flex-wrap gap-1">
          {problem.topics.slice(0, 3).map((topic) => (
            <span
              key={topic}
              className="rounded-md border border-white/10 bg-[var(--bg-secondary)]/70 px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]"
            >
              {topic}
            </span>
          ))}
        </div>
      </td>

      <td className="px-3 py-3 text-sm text-[var(--text-secondary)]">{problem.acceptance.toFixed(1)}%</td>

      <td className="px-3 py-3">
        <DifficultyBadge difficulty={problem.difficulty} />
      </td>

      <td className="px-3 py-3 text-center">
        <span
          className={clsx(
            "inline-flex rounded-full border p-1.5",
            problem.premium
              ? "border-amber-300/40 bg-amber-300/10 text-amber-200"
              : "border-white/10 bg-[var(--bg-secondary)]/80 text-[var(--text-muted)]"
          )}
          title={problem.premium ? "Premium placeholder" : "Free problem"}
        >
          {problem.premium ? <Lock className="h-3.5 w-3.5" /> : <LockOpen className="h-3.5 w-3.5" />}
        </span>
      </td>
    </motion.tr>
  );
}
