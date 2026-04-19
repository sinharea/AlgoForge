"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { userApi } from "@/src/api/userApi";

export default function SolveSpeedChart() {
  const query = useQuery({
    queryKey: ["solve-speed"],
    queryFn: async () => (await userApi.solveSpeed(3)).data,
    retry: 1,
  });

  const data = useMemo(() => {
    const raw: Array<{ month: string; difficulty: string; avgTime: number }> = query.data || [];
    // Group flat array [{month, difficulty, avgTime}] by month
    const byMonth: Record<string, Record<string, number>> = {};
    for (const r of raw) {
      if (!byMonth[r.month]) byMonth[r.month] = {};
      byMonth[r.month][r.difficulty] = Number((r.avgTime / 1000).toFixed(1));
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, diffs]) => ({
        month,
        Easy: diffs.Easy ?? 0,
        Medium: diffs.Medium ?? 0,
        Hard: diffs.Hard ?? 0,
      }));
  }, [query.data]);

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Solve Speed</h3>
        <p className="text-sm text-[var(--text-secondary)]">Average time to solve (seconds) by difficulty</p>
      </div>

      {query.isLoading ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-[var(--text-muted)]">Loading…</div>
      ) : data.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-[var(--border-color)] text-sm text-[var(--text-muted)]">
          Not enough data yet.
        </div>
      ) : (
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 0, right: 8 }}>
              <CartesianGrid stroke="rgba(148,163,184,.08)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                label={{ value: "Seconds", angle: -90, position: "insideLeft", fill: "var(--text-muted)", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "0.75rem",
                }}
                formatter={(val: number) => [`${val}s`]}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              <Bar dataKey="Easy" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Medium" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Hard" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
