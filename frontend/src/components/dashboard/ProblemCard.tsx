"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bookmark } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { DifficultyBadge } from "@/src/components/ui/Badge";
import { RecommendedProblem } from "@/src/data/dashboardMock";
import { userApi } from "@/src/api/userApi";

type ProblemCardProps = {
  problem: RecommendedProblem;
};

export default function ProblemCard({ problem }: ProblemCardProps) {
  const recommendationTag = problem.recommendationTag || "Level Up";
  const [bookmarked, setBookmarked] = useState(problem.bookmarked ?? false);
  const queryClient = useQueryClient();

  const handleBookmark = async () => {
    try {
      await userApi.toggleBookmark(problem.id);
      setBookmarked((prev) => !prev);
      queryClient.invalidateQueries({ queryKey: ["problem-statuses-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["problem-statuses"] });
    } catch {
      // silently fail
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.22 }}
      className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 shadow-[0_14px_30px_-24px_rgba(92,67,31,0.5)]"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">{problem.title}</h4>
        <button
          type="button"
          title="Bookmark"
          onClick={handleBookmark}
          className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-tertiary)] hover:text-[var(--accent-muted)]"
        >
          <Bookmark className={`h-4 w-4 ${bookmarked ? "fill-[#8b6a35] text-[#8b6a35]" : ""}`} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {problem.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-[var(--border-color)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--accent-secondary)]">
          {problem.confidenceScore ?? 82}% match
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            recommendationTag === "Fix Weakness"
              ? "bg-[#fde7cf] text-[#9b5c11]"
              : "bg-[#dcf0e2] text-[#2b6c44]"
          }`}
        >
          {recommendationTag}
        </span>
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
