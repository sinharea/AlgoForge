"use client";

import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/src/api/authApi";
import { DashboardSkeleton } from "@/src/components/ui/Skeleton";
import ErrorState from "@/src/components/ui/ErrorState";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";
import StatsCard from "@/src/components/ui/StatsCard";
import { DifficultyBadge } from "@/src/components/ui/Badge";
import {
  Trophy,
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

const COLORS = {
  Easy: "#10b981",
  Medium: "#f59e0b",
  Hard: "#ef4444",
};

export default function DashboardPage() {
  useProtectedRoute();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => (await authApi.meDashboard()).data,
  });

  const { data: recommendations } = useQuery({
    queryKey: ["recommendations"],
    queryFn: async () => (await authApi.recommendations()).data,
  });

  if (isLoading) return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <DashboardSkeleton />
    </div>
  );

  if (isError) return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <ErrorState message="Failed to load dashboard" />
    </div>
  );

  const difficultyData = Object.entries(data.byDifficulty || {}).map(([name, value]) => ({
    name,
    value: value as number,
    color: COLORS[name as keyof typeof COLORS],
  }));

  const topicData = Object.entries(data.byTopic || {})
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 8)
    .map(([name, value]) => ({
      name: name.length > 12 ? name.slice(0, 12) + "..." : name,
      solved: value as number,
    }));

  const totalProblems = 500;
  const progressPercent = Math.round((data.totalSolved / totalProblems) * 100);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-2 text-[var(--text-secondary)]">Track your progress and performance</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Problems Solved"
          value={data.totalSolved}
          icon={Trophy}
          color="violet"
        />
        <StatsCard
          title="Easy"
          value={data.byDifficulty?.Easy || 0}
          icon={CheckCircle2}
          color="emerald"
        />
        <StatsCard
          title="Medium"
          value={data.byDifficulty?.Medium || 0}
          icon={AlertCircle}
          color="amber"
        />
        <StatsCard
          title="Hard"
          value={data.byDifficulty?.Hard || 0}
          icon={XCircle}
          color="rose"
        />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-6 text-lg font-semibold">Difficulty Distribution</h2>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={difficultyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {difficultyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-secondary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-center gap-6">
            {difficultyData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-[var(--text-secondary)]">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="mb-6 text-lg font-semibold">Topics Breakdown</h2>
          <div className="h-[280px]">
            {topicData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topicData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 12 }} width={90} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="solved" fill="var(--accent-primary)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-[var(--text-muted)]">
                Solve problems to see topic breakdown
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Overall Progress</h2>
          <span className="text-sm text-[var(--text-secondary)]">{progressPercent}% complete</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-bar-fill bg-gradient-to-r from-violet-500 to-purple-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          You&apos;ve solved {data.totalSolved} out of {totalProblems} problems
        </p>
      </div>

      {recommendations?.suggestions?.length > 0 && (
        <div className="card">
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-[var(--accent-secondary)]" />
            <h2 className="text-lg font-semibold">Recommended for You</h2>
          </div>
          <p className="mb-4 text-sm text-[var(--text-secondary)]">
            Based on your performance, try these {recommendations.targetDifficulty} problems
            {recommendations.weakTopics?.length > 0 && (
              <> focusing on: {recommendations.weakTopics.join(", ")}</>
            )}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.suggestions.slice(0, 6).map((problem: any) => (
              <a
                key={problem._id}
                href={`/problems/${problem.slug}`}
                className="flex items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 transition-colors hover:border-[var(--accent-primary)]"
              >
                <div>
                  <div className="font-medium text-sm">{problem.title}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(problem.tags || []).slice(0, 2).map((tag: string) => (
                      <span key={tag} className="text-xs text-[var(--text-muted)]">{tag}</span>
                    ))}
                  </div>
                </div>
                <DifficultyBadge difficulty={problem.difficulty} />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
