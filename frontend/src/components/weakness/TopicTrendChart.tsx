"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { userApi } from "@/src/api/userApi";

const COLORS = ["#8b5cf6", "#38bdf8", "#22c55e", "#f59e0b", "#ef4444", "#ec4899"];

export default function TopicTrendChart() {
  const topicStatsQuery = useQuery({
    queryKey: ["topic-stats"],
    queryFn: async () => (await userApi.topicStats()).data,
    retry: 1,
  });

  const availableTopics = useMemo(() => {
    return ((topicStatsQuery.data as any[]) || [])
      .filter((s: any) => s.totalAttempts >= 3)
      .sort((a: any, b: any) => b.totalAttempts - a.totalAttempts)
      .slice(0, 6)
      .map((s: any) => s.topic);
  }, [topicStatsQuery.data]);

  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const topics = selectedTopics.length ? selectedTopics : availableTopics.slice(0, 4);

  const query = useQuery({
    queryKey: ["topic-trends", topics],
    queryFn: async () => (await userApi.topicTrends(topics, 8)).data,
    enabled: topics.length > 0,
    retry: 1,
  });

  const chartData = useMemo(() => {
    const raw: any[] = query.data || [];
    if (!raw.length) return [];

    // Backend returns flat array: [{topic, week, year, accuracy, total}]
    // Group by topic, then pivot into chart rows by week
    const topicMap: Record<string, Record<string, number>> = {};
    for (const r of raw) {
      const weekLabel = `W${r.week}`;
      if (!topicMap[weekLabel]) topicMap[weekLabel] = {};
      topicMap[weekLabel][r.topic] = Number(r.accuracy?.toFixed(0) ?? 0);
    }

    return Object.entries(topicMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, topics]) => ({ week, ...topics }));
  }, [query.data]);

  const toggleTopic = (t: string) => {
    setSelectedTopics((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Topic Accuracy Trends</h3>
        <p className="text-sm text-[var(--text-secondary)]">Weekly accuracy per topic over time</p>
      </div>

      {availableTopics.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {availableTopics.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTopic(t)}
              className={`rounded-full px-2.5 py-0.5 text-xs transition ${
                topics.includes(t)
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  : "border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {query.isLoading ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-[var(--text-muted)]">Loading…</div>
      ) : chartData.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-[var(--border-color)] text-sm text-[var(--text-muted)]">
          Not enough data yet.
        </div>
      ) : (
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="rgba(148,163,184,.08)" />
              <XAxis dataKey="week" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "0.75rem",
                }}
                formatter={(val) => [`${Number(val ?? 0).toFixed(0)}%`]}
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
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
