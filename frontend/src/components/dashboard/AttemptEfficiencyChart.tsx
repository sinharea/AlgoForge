"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { userApi } from "@/src/api/userApi";

const TOPICS = ["Array", "DP", "Graph", "Tree", "String", "Stack", "Greedy", "Two Pointers", "Binary Search", "Math"];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const RANGES = [
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "All Time", value: undefined },
];

export default function AttemptEfficiencyChart() {
  const [topic, setTopic] = useState<string | undefined>();
  const [difficulty, setDifficulty] = useState<string | undefined>();
  const [range, setRange] = useState<string | undefined>(undefined);
  const [chartMode, setChartMode] = useState<"bar" | "line">("bar");

  const query = useQuery({
    queryKey: ["attempt-efficiency", topic, difficulty, range],
    queryFn: async () => (await userApi.attemptEfficiency({ topic, difficulty, range })).data,
    retry: 1,
  });

  const data = useMemo(() => {
    const rows = [...(query.data || [])].sort((a: any, b: any) => {
      const aTs = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTs = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return aTs - bTs;
    });

    return rows.map((d: any) => ({
      name: d.title?.length > 18 ? d.title.slice(0, 16) + "…" : d.title,
      efficiency: Number((d.efficiency * 100).toFixed(0)),
      attempts: d.attempts,
      difficulty: d.difficulty,
      fullTitle: d.title,
    }));
  }, [query.data]);

  const getBarColor = (d: string) => {
    if (d === "Easy") return "#22c55e";
    if (d === "Medium") return "#f59e0b";
    return "#ef4444";
  };

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Attempt Efficiency</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            How many attempts to solve — higher bar = fewer attempts needed
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={topic || ""}
            onChange={(e) => setTopic(e.target.value || undefined)}
            className="rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 py-1 text-xs text-[var(--text-secondary)]"
          >
            <option value="">All Topics</option>
            {TOPICS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={difficulty || ""}
            onChange={(e) => setDifficulty(e.target.value || undefined)}
            className="rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 py-1 text-xs text-[var(--text-secondary)]"
          >
            <option value="">All Difficulties</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <div className="flex gap-0.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => setRange(r.value)}
                className={`rounded px-2 py-0.5 text-xs transition ${
                  range === r.value
                    ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-[var(--text-muted)]">Loading…</div>
      ) : data.length === 0 ? (
        <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-[var(--border-color)] text-sm text-[var(--text-muted)]">
          No solved problems match these filters yet.
        </div>
      ) : (
        <div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === "bar" ? (
                <BarChart data={data} margin={{ left: 0, right: 8, bottom: 40 }}>
                  <CartesianGrid stroke="rgba(148,163,184,.08)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: "Efficiency %", angle: -90, position: "insideLeft", fill: "var(--text-muted)", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "0.75rem",
                      fontSize: "0.8rem",
                    }}
                    formatter={(value: number, _: string, entry: any) => [
                      `${value}% (${entry.payload.attempts} attempt${entry.payload.attempts > 1 ? "s" : ""})`,
                      entry.payload.fullTitle,
                    ]}
                  />
                  <Bar dataKey="efficiency" radius={[6, 6, 0, 0]} animationDuration={700}>
                    {data.map((entry: any, idx: number) => (
                      <Cell key={idx} fill={getBarColor(entry.difficulty)} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <LineChart data={data} margin={{ left: 0, right: 8, bottom: 40 }}>
                  <CartesianGrid stroke="rgba(148,163,184,.08)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    label={{ value: "Efficiency %", angle: -90, position: "insideLeft", fill: "var(--text-muted)", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "0.75rem",
                      fontSize: "0.8rem",
                    }}
                    formatter={(value: number, _: string, entry: any) => [
                      `${value}% (${entry.payload.attempts} attempt${entry.payload.attempts > 1 ? "s" : ""})`,
                      entry.payload.fullTitle,
                    ]}
                  />
                  <Line
                    type="linear"
                    dataKey="efficiency"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#f59e0b", stroke: "#f59e0b" }}
                    activeDot={{ r: 5, fill: "#f59e0b", stroke: "#f59e0b" }}
                    animationDuration={700}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex justify-end">
            <div className="flex gap-0.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] p-0.5">
              <button
                type="button"
                onClick={() => setChartMode("bar")}
                className={`rounded px-2.5 py-1 text-xs transition ${
                  chartMode === "bar"
                    ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                Bars
              </button>
              <button
                type="button"
                onClick={() => setChartMode("line")}
                className={`rounded px-2.5 py-1 text-xs transition ${
                  chartMode === "line"
                    ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                }`}
              >
                Line
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
