"use client";

import { useQuery } from "@tanstack/react-query";
import { Trophy, Star, Flame, Target, CheckCircle2 } from "lucide-react";
import { userApi } from "@/src/api/userApi";

export default function DynamicMilestones() {
  const query = useQuery({
    queryKey: ["milestones"],
    queryFn: async () => (await userApi.milestones()).data,
    retry: 1,
  });

  if (query.isLoading) return null;
  const milestones: Array<{
    id: string;
    title: string;
    detail: string;
    earned: boolean;
    progress: number;
  }> = query.data || [];
  if (!milestones.length) return null;

  const getIcon = (id: string) => {
    if (id.startsWith("solve")) return <Target className="h-4 w-4" />;
    if (id.startsWith("streak")) return <Flame className="h-4 w-4" />;
    if (id.startsWith("master")) return <Trophy className="h-4 w-4" />;
    if (id.startsWith("easy") || id.startsWith("medium") || id.startsWith("hard"))
      return <Star className="h-4 w-4" />;
    return <Target className="h-4 w-4" />;
  };

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-5 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-[#3b2f1e] dark:text-[var(--text-primary)]">Milestones</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {milestones.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3">
            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
              m.earned ? "bg-emerald-500/15 text-emerald-600" : "bg-violet-500/15 text-violet-500"
            }`}>
              {m.earned ? <CheckCircle2 className="h-4 w-4" /> : getIcon(m.id)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className="truncate font-semibold text-[#3b2f1e] dark:text-[var(--text-primary)]">
                  {m.title}
                </span>
                <span className="font-medium text-[#5a4a30] dark:text-[var(--text-secondary)]">
                  {m.progress}%
                </span>
              </div>
              <p className="mt-0.5 truncate text-[10px] text-[#7a6b50] dark:text-[var(--text-muted)]">{m.detail}</p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    m.earned
                      ? "bg-gradient-to-r from-emerald-500 to-green-400"
                      : "bg-gradient-to-r from-violet-500 to-blue-500"
                  }`}
                  style={{ width: `${Math.min(m.progress, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
