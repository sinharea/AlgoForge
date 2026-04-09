"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, BookOpen, Flag, Trophy, Users } from "lucide-react";
import { adminApi } from "@/src/api/adminApi";

const quickLinks = [
  { href: "/admin/problems", label: "Problem Manager", icon: BookOpen },
  { href: "/admin/contests", label: "Contest Manager", icon: Trophy },
  { href: "/admin/users", label: "User Manager", icon: Users },
  { href: "/admin/reports", label: "Moderation Reports", icon: Flag },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AdminDashboard() {
  const analyticsQuery = useQuery({
    queryKey: ["admin-dashboard-analytics"],
    queryFn: async () => (await adminApi.getAnalytics()).data,
  });

  const reportsQuery = useQuery({
    queryKey: ["admin-dashboard-reports"],
    queryFn: async () => (await adminApi.getReports({ page: 1, limit: 5, status: "pending" })).data,
  });

  if (analyticsQuery.isLoading || reportsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="card h-28 animate-pulse" />
        <div className="card h-64 animate-pulse" />
      </div>
    );
  }

  if (analyticsQuery.isError) {
    return (
      <div className="card">
        <p className="text-sm text-rose-300">Failed to load admin dashboard analytics.</p>
      </div>
    );
  }

  const analytics = analyticsQuery.data ?? {
    totalUsers: 0,
    activeUsers: 0,
    submissionsPerDay: [],
    popularProblems: [],
  };
  const pendingReports = reportsQuery.data?.total || 0;

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
          <p className="text-sm text-[var(--text-secondary)]">Pending Reports</p>
          <p className="mt-2 text-3xl font-bold text-amber-300">{pendingReports}</p>
        </div>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">Quick Actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 text-sm transition-colors hover:border-[var(--accent-primary)]"
              >
                <div className="flex items-center gap-2 text-[var(--text-primary)]">
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{link.label}</span>
                </div>
              </Link>
            );
          })}
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
              {(analytics.popularProblems || []).slice(0, 8).map((item) => (
                <tr key={item.problemId} className="border-t border-[var(--border-color)]">
                  <td className="px-3 py-2">{item.title || "Unknown Problem"}</td>
                  <td className="px-3 py-2">{item.difficulty || "-"}</td>
                  <td className="px-3 py-2">{item.submissions}</td>
                </tr>
              ))}
              {analytics.popularProblems.length === 0 && (
                <tr>
                  <td className="px-3 py-3 text-[var(--text-secondary)]" colSpan={3}>
                    No submissions data yet.
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
