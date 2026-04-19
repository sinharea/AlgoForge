"use client";

import { useQuery } from "@tanstack/react-query";
import { Lightbulb, TrendingUp, Zap, Flame } from "lucide-react";
import { userApi } from "@/src/api/userApi";

const ICON_MAP: Record<string, React.ReactNode> = {
  weakness: <Lightbulb className="h-5 w-5 text-amber-400" />,
  improvement: <TrendingUp className="h-5 w-5 text-emerald-400" />,
  speed: <Zap className="h-5 w-5 text-blue-400" />,
  streak: <Flame className="h-5 w-5 text-orange-400" />,
};

const BG_MAP: Record<string, string> = {
  weakness: "border-amber-500/20 bg-amber-500/5",
  improvement: "border-emerald-500/20 bg-emerald-500/5",
  speed: "border-blue-500/20 bg-blue-500/5",
  streak: "border-orange-500/20 bg-orange-500/5",
};

export default function InsightCards() {
  const query = useQuery({
    queryKey: ["insights"],
    queryFn: async () => (await userApi.insights()).data,
    retry: 1,
  });

  if (query.isLoading) return null;
  const insights: Array<{ type: string; title: string; body: string }> = query.data || [];
  if (!insights.length) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {insights.map((insight) => (
        <div
          key={insight.type}
          className={`rounded-xl border p-4 ${BG_MAP[insight.type] || "border-[var(--border-color)] bg-[var(--bg-elevated)]"}`}
        >
          <div className="mb-2 flex items-center gap-2">
            {ICON_MAP[insight.type]}
            <span className="text-sm font-medium text-[var(--text-primary)]">{insight.title}</span>
          </div>
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{insight.body}</p>
        </div>
      ))}
    </div>
  );
}
