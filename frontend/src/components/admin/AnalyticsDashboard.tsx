"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminApi } from "@/src/api/adminApi";

export default function AnalyticsDashboard() {
  const analyticsQuery = useQuery({
    queryKey: ["admin-analytics-page"],
    queryFn: async () => (await adminApi.getAnalytics()).data,
  });

  const chartData = useMemo(
    () => analyticsQuery.data?.submissionsPerDay || [],
    [analyticsQuery.data]
  );

  if (analyticsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="card h-28 animate-pulse" />
        <div className="card h-80 animate-pulse" />
      </div>
    );
  }

  if (analyticsQuery.isError || !analyticsQuery.data) {
    return (
      <div className="card">
        <p className="text-sm text-rose-300">Failed to load analytics data.</p>
      </div>
    );
  }

  const analytics = analyticsQuery.data;
  const activeRate = analytics.totalUsers
    ? Math.round((analytics.activeUsers / analytics.totalUsers) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <p className="text-sm text-[var(--text-secondary)]">Total Users</p>
          <p className="mt-2 text-3xl font-bold">{analytics.totalUsers}</p>
        </div>
        <div className="card">
          <p className="text-sm text-[var(--text-secondary)]">Active Users</p>
          <p className="mt-2 text-3xl font-bold text-emerald-300">{analytics.activeUsers}</p>
        </div>
        <div className="card">
          <p className="text-sm text-[var(--text-secondary)]">Active Rate</p>
          <p className="mt-2 text-3xl font-bold text-cyan-300">{activeRate}%</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">Submissions Per Day</h2>
        <div className="mt-4 h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
              <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid rgba(148,163,184,.25)",
                  borderRadius: 12,
                }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Bar dataKey="count" fill="#38bdf8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">Popular Problems</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--text-secondary)]">
                <th className="px-3 py-2">Problem</th>
                <th className="px-3 py-2">Difficulty</th>
                <th className="px-3 py-2">Submissions</th>
              </tr>
            </thead>
            <tbody>
              {analytics.popularProblems.map((problem) => (
                <tr key={problem.problemId} className="border-t border-[var(--border-color)]">
                  <td className="px-3 py-2">{problem.title || "Unknown Problem"}</td>
                  <td className="px-3 py-2">{problem.difficulty || "-"}</td>
                  <td className="px-3 py-2">{problem.submissions}</td>
                </tr>
              ))}

              {analytics.popularProblems.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-[var(--text-secondary)]">
                    No submissions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
