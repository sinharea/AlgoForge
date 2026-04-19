"use client";

import { useQuery } from "@tanstack/react-query";
import { userApi } from "@/src/api/userApi";

type WeaknessTopic = {
  topic: string;
  severity: number;
  accuracy: number;
  attempts: number;
  trend: "improving" | "declining" | "stable";
  difficultyGap: string;
  priority: "critical" | "high" | "medium" | "low";
};

const PRIORITY_STYLES: Record<string, string> = {
  critical: "border-rose-500/30 bg-rose-500/10 text-rose-400",
  high: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  medium: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
};

const TREND_ICON: Record<string, string> = {
  improving: "↑",
  declining: "↓",
  stable: "→",
};

const TREND_COLOR: Record<string, string> = {
  improving: "text-emerald-400",
  declining: "text-rose-400",
  stable: "text-[var(--text-muted)]",
};

export default function SeverityMatrix() {
  const query = useQuery({
    queryKey: ["weakness-detailed"],
    queryFn: async () => (await userApi.weaknessDetailed()).data,
    retry: 1,
  });

  if (query.isLoading) return null;

  const topics: WeaknessTopic[] = (query.data?.weakTopics || []).map((t: any) => ({
    topic: t.topic,
    severity: t.severity,
    accuracy: t.accuracy,
    attempts: t.attempts,
    trend: t.trend || "stable",
    difficultyGap: t.difficultyGap || "",
    priority: t.severity >= 75 ? "critical" : t.severity >= 50 ? "high" : t.severity >= 25 ? "medium" : "low",
  }));

  if (!topics.length) return null;

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Weakness Severity Matrix</h3>
        <p className="text-sm text-[var(--text-secondary)]">Topics ranked by severity score — higher = needs more work</p>
      </div>

      <div className="space-y-3">
        {topics.map((t) => (
          <div
            key={t.topic}
            className="flex items-center gap-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--text-primary)]">{t.topic}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${PRIORITY_STYLES[t.priority]}`}>
                  {t.priority}
                </span>
                <span className={`text-xs font-medium ${TREND_COLOR[t.trend]}`}>
                  {TREND_ICON[t.trend]} {t.trend}
                </span>
              </div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                {t.accuracy.toFixed(0)}% accuracy · {t.attempts} attempts
                {t.difficultyGap ? ` · Gap: ${t.difficultyGap}` : ""}
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="text-lg font-bold text-[var(--text-primary)]">{t.severity.toFixed(0)}</div>
              <div className="text-[10px] text-[var(--text-muted)]">severity</div>
            </div>

            <div className="w-24">
              <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div
                  className={`h-full rounded-full transition-all ${
                    t.severity >= 75 ? "bg-rose-500" : t.severity >= 50 ? "bg-amber-500" : t.severity >= 25 ? "bg-blue-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(t.severity, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
