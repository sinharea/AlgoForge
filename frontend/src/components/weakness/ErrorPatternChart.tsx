"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { userApi } from "@/src/api/userApi";

const ERROR_COLORS: Record<string, string> = {
  "Runtime Error": "#ef4444",
  "Wrong Answer": "#f59e0b",
  "Time Limit Exceeded": "#8b5cf6",
  "Memory Limit Exceeded": "#ec4899",
  "Compilation Error": "#64748b",
};

export default function ErrorPatternChart() {
  const query = useQuery({
    queryKey: ["error-patterns"],
    queryFn: async () => (await userApi.errorPatterns()).data,
    retry: 1,
  });

  const grouped = useMemo(() => {
    // Backend returns flat: [{topic, verdict, count}]
    // Group into [{topic, errors: {verdict: count}}]
    const raw: Array<{ topic: string; verdict: string; count: number }> = query.data || [];
    const map: Record<string, Record<string, number>> = {};
    for (const r of raw) {
      if (!r.topic) continue;
      if (!map[r.topic]) map[r.topic] = {};
      map[r.topic][r.verdict] = (map[r.topic][r.verdict] || 0) + r.count;
    }
    return Object.entries(map).map(([topic, errors]) => ({ topic, errors }));
  }, [query.data]);

  const data = useMemo(() => {
    return grouped
      .filter((item) => item.errors && typeof item.errors === "object")
      .slice(0, 8)
      .map((item) => {
        const row: Record<string, string | number> = { topic: item.topic };
        for (const [err, count] of Object.entries(item.errors)) {
          row[err] = count;
        }
        return row;
      });
  }, [grouped]);

  const errorTypes = useMemo(() => {
    const types = new Set<string>();
    for (const item of grouped) {
      for (const key of Object.keys(item.errors || {})) types.add(key);
    }
    return [...types];
  }, [grouped]);

  if (query.isLoading) return null;
  if (!data.length) return null;

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Error Patterns</h3>
        <p className="text-sm text-[var(--text-secondary)]">Common error types per topic</p>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 20, right: 8 }}>
            <CartesianGrid stroke="rgba(148,163,184,.08)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="topic"
              tick={{ fill: "var(--text-muted)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--bg-secondary)",
                border: "1px solid var(--border-color)",
                borderRadius: "0.75rem",
              }}
            />
            {errorTypes.map((errType) => (
              <Bar
                key={errType}
                dataKey={errType}
                stackId="errors"
                fill={ERROR_COLORS[errType] || "#64748b"}
                radius={0}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {errorTypes.map((errType) => (
          <div key={errType} className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: ERROR_COLORS[errType] || "#64748b" }} />
            {errType}
          </div>
        ))}
      </div>
    </section>
  );
}
