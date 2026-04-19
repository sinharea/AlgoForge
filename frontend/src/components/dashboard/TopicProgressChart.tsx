"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { userApi } from "@/src/api/userApi";

const COLORS = ["#8b5cf6", "#38bdf8", "#22c55e", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6"];

export default function TopicProgressChart() {
  const [granularity, setGranularity] = useState<"weekly" | "monthly">("weekly");

  const query = useQuery({
    queryKey: ["topic-progress", granularity],
    queryFn: async () => (await userApi.topicProgress({ granularity, months: 3 })).data,
    retry: 1,
  });

  const { chartData, topics } = useMemo(() => {
    const raw: Array<{ topic: string; data: Array<{ period: string; solved: number }> }> = query.data || [];
    if (!raw.length) return { chartData: [], topics: [] };

    const topicList = raw.map((t) => t.topic);
    const periodSet = new Set<string>();
    for (const t of raw) for (const d of t.data) periodSet.add(d.period);
    const periods = [...periodSet].sort();

    const mapped = periods.map((period) => {
      const row: Record<string, string | number> = { period };
      for (const t of raw) {
        const match = t.data.find((d) => d.period === period);
        row[t.topic] = match?.solved || 0;
      }
      return row;
    });

    return { chartData: mapped, topics: topicList };
  }, [query.data]);

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Topic Progress</h3>
          <p className="text-sm text-[var(--text-secondary)]">Problems solved per topic over time</p>
        </div>
        <div className="flex gap-0.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] p-0.5">
          {(["weekly", "monthly"] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGranularity(g)}
              className={`rounded px-2.5 py-1 text-xs transition ${
                granularity === g
                  ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {g === "weekly" ? "Weekly" : "Monthly"}
            </button>
          ))}
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-[var(--text-muted)]">Loading…</div>
      ) : chartData.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-[var(--border-color)] text-sm text-[var(--text-muted)]">
          Not enough data yet.
        </div>
      ) : (
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: 0, right: 8 }}>
              <CartesianGrid stroke="rgba(148,163,184,.08)" />
              <XAxis dataKey="period" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "0.75rem",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              {topics.map((topic, idx) => (
                <Line
                  key={topic}
                  type="monotone"
                  dataKey={topic}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
