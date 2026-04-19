"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { userApi } from "@/src/api/userApi";

export default function AccuracyTrendChart() {
  const [days, setDays] = useState(30);

  const query = useQuery({
    queryKey: ["accuracy-trend", days],
    queryFn: async () => (await userApi.accuracyTrend(days)).data,
    retry: 1,
  });

  const data = useMemo(() => {
    return (query.data || []).map((d: any) => ({
      date: d.date?.slice(5),
      accuracy: Number(d.accuracy?.toFixed(1) ?? 0),
      total: d.total,
      accepted: d.accepted,
    }));
  }, [query.data]);

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Accuracy Trend</h3>
          <p className="text-sm text-[var(--text-secondary)]">Rolling daily accuracy percentage</p>
        </div>
        <div className="flex gap-0.5 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)] p-0.5">
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`rounded px-2.5 py-1 text-xs transition ${
                days === d
                  ? "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
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
            <AreaChart data={data} margin={{ left: 0, right: 8 }}>
              <defs>
                <linearGradient id="accGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148,163,184,.08)" />
              <XAxis dataKey="date" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-secondary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "0.75rem",
                }}
                formatter={(val: number) => [`${val}%`, "Accuracy"]}
              />
              <Area type="monotone" dataKey="accuracy" stroke="#22c55e" fill="url(#accGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
