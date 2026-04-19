"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { userApi } from "@/src/api/userApi";

const DIFF_COLORS: Record<string, string> = {
  Easy: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  Medium: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  Hard: "text-rose-400 border-rose-500/30 bg-rose-500/10",
};

export default function PracticePlan() {
  const query = useQuery({
    queryKey: ["weakness-detailed"],
    queryFn: async () => (await userApi.weaknessDetailed()).data,
    retry: 1,
  });

  if (query.isLoading) return null;

  const problems: Array<{
    id: string;
    title: string;
    slug: string;
    difficulty: string;
    tags: string[];
    score: number;
    reason: string;
    priority: string;
  }> = query.data?.recommendations || [];

  if (!problems.length) return null;

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Practice Plan</h3>
        <p className="text-sm text-[var(--text-secondary)]">ML-scored problems prioritized for your growth</p>
      </div>

      <div className="space-y-2.5">
        {problems.map((p, idx) => (
          <Link
            key={p.id}
            href={`/problems/${p.slug}`}
            className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 transition hover:border-[var(--accent-muted)]"
            onClick={() => {
              userApi.recFeedback(p.id, "click").catch(() => {});
            }}
          >
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[var(--bg-elevated)] text-xs font-bold text-[var(--text-muted)]">
              {idx + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--text-primary)] truncate">{p.title}</span>
                <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${DIFF_COLORS[p.difficulty] || ""}`}>
                  {p.difficulty}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--text-muted)] truncate">{p.reason}</p>
            </div>
            <span className="text-xs font-medium text-[var(--text-secondary)]">{p.score.toFixed(0)}%</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
