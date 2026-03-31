"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Bookmark } from "lucide-react";
import { DifficultyBadge } from "@/src/components/ui/Badge";
import { RecommendedProblem } from "@/src/data/dashboardMock";

type ProblemCardProps = {
  problem: RecommendedProblem;
};

export default function ProblemCard({ problem }: ProblemCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.22 }}
      className="rounded-xl border border-white/10 bg-[#0f1322] p-4 shadow-[0_14px_30px_-24px_rgba(168,85,247,1)]"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="line-clamp-2 text-sm font-semibold text-white">{problem.title}</h4>
        <button
          type="button"
          title="Bookmark"
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-violet-300"
        >
          <Bookmark className={`h-4 w-4 ${problem.bookmarked ? "fill-violet-400 text-violet-400" : ""}`} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {problem.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-slate-300"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <DifficultyBadge difficulty={problem.difficulty} />
        <Link href={`/problems/${problem.slug}`} className="btn btn-primary px-3 py-1.5 text-xs">
          Solve
        </Link>
      </div>
    </motion.article>
  );
}
