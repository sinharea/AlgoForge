"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlarmClock,
  BarChart3,
  CheckCircle2,
  Flame,
  Sparkles,
  Target,
  Trophy,
  XCircle,
  AlertCircle,
  Medal,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { formatDistanceToNow } from "date-fns";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";
import { authApi } from "@/src/api/authApi";
import { userApi } from "@/src/api/userApi";
import { problemApi } from "@/src/api/problemApi";
import { useAuthContext } from "@/src/context/AuthContext";
import ChartCard from "@/src/components/dashboard/ChartCard";
import ProblemCard from "@/src/components/dashboard/ProblemCard";
import StatCard from "@/src/components/dashboard/StatCard";
import DashboardSkeleton from "@/src/components/dashboard/DashboardSkeleton";
import ActivityHeatmap from "@/src/components/dashboard/ActivityHeatmap";
import { DashboardMockData, RecommendedProblem } from "@/src/data/dashboardMock";

const chartColors = {
  Easy: "#22c55e",
  Medium: "#f59e0b",
  Hard: "#ef4444",
};

const milestones = [25, 50, 75, 100];

const toDateKey = (value: string | Date) => new Date(value).toISOString().slice(0, 10);

const computeStreak = (submissions: any[]) => {
  const solvedDays = new Set(
    submissions
      .filter((item) => item?.verdict === "Accepted")
      .map((item) => toDateKey(item.createdAt))
  );

  if (solvedDays.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = toDateKey(cursor);
    if (!solvedDays.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

export default function DashboardPage() {
  useProtectedRoute();
  const { user } = useAuthContext();

  const dashboardQuery = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => (await authApi.meDashboard()).data,
    retry: 1,
  });

  const recommendationsQuery = useQuery({
    queryKey: ["recommendations"],
    queryFn: async () => (await authApi.recommendations()).data,
    retry: 1,
  });

  const recentQuery = useQuery({
    queryKey: ["my-submissions-dashboard"],
    queryFn: async () => (await problemApi.mySubmissions({ page: 1, limit: 100 })).data,
    retry: 1,
  });

  const heatmapQuery = useQuery({
    queryKey: ["heatmap", new Date().getFullYear()],
    queryFn: async () => (await userApi.heatmap(new Date().getFullYear())).data,
    retry: 1,
  });

  const profileQuery = useQuery({
    queryKey: ["me-profile"],
    queryFn: async () => (await authApi.me()).data,
    retry: 1,
  });

  const loading =
    dashboardQuery.isLoading || recommendationsQuery.isLoading || recentQuery.isLoading;

  const data = useMemo<DashboardMockData>(() => {
    const stats = dashboardQuery.data || {};
    const rec = recommendationsQuery.data || {};
    const allSubmissions = recentQuery.data?.items || [];
    const profile = profileQuery.data || {};

    const recommended: RecommendedProblem[] =
      (rec?.suggestions || []).map((item: any) => ({
        id: String(item._id || item.id),
        title: item.title,
        slug: item.slug,
        difficulty: item.difficulty,
        tags: item.tags || [],
      })) || [];

    const solved = Number(stats?.totalSolved ?? profile?.totalSolved ?? 0);
    const easy = Number(stats?.byDifficulty?.Easy ?? profile?.easyCount ?? 0);
    const medium = Number(stats?.byDifficulty?.Medium ?? profile?.mediumCount ?? 0);
    const hard = Number(stats?.byDifficulty?.Hard ?? profile?.hardCount ?? 0);

    // Use server-side streak if available, fallback to computed
    const streakDays = Number(profile?.currentStreak) || computeStreak(allSubmissions) || 0;

    const achievements = [
      {
        id: "g1",
        title: "First Problem Solved",
        detail: "Complete your first accepted submission",
        earned: solved > 0,
      },
      {
        id: "g2",
        title: "10 Easy Done",
        detail: "Solve 10 Easy problems",
        earned: easy >= 10,
      },
      {
        id: "g3",
        title: "7-Day Streak",
        detail: "Solve at least one problem for 7 days",
        earned: streakDays >= 7,
      },
      {
        id: "g4",
        title: "Hard Hunter",
        detail: "Solve 25 Hard problems",
        earned: hard >= 25,
      },
    ];

    return {
      userName: user?.name || "Coder",
      totalSolved: solved,
      totalProblems: 500,
      streakDays,
      byDifficulty: {
        Easy: easy,
        Medium: medium,
        Hard: hard,
      },
      byTopic:
        stats?.byTopic && Object.keys(stats.byTopic).length > 0
          ? stats.byTopic
          : {},
      recommendations: recommended.length > 0 ? recommended : [],
      recentActivity:
        allSubmissions.length > 0
          ? allSubmissions.slice(0, 5).map((item: any) => ({
              id: String(item._id),
              title: item.problem?.title || "Solved Problem",
              solvedAt: item.createdAt,
            }))
          : [],
      achievements,
    };
  }, [dashboardQuery.data, recommendationsQuery.data, recentQuery.data, profileQuery.data, user?.name]);

  const progressPercent = Math.min(
    100,
    Math.round((data.totalSolved / Math.max(data.totalProblems, 1)) * 100)
  );

  const difficultyData = useMemo(
    () =>
      Object.entries(data.byDifficulty).map(([name, value]) => ({
        name,
        value,
        color: chartColors[name as keyof typeof chartColors],
      })),
    [data.byDifficulty]
  );

  const topicData = useMemo(
    () =>
      Object.entries(data.byTopic)
        .map(([name, solved]) => ({ name, solved }))
        .sort((a, b) => b.solved - a.solved)
        .slice(0, 7),
    [data.byTopic]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-[var(--border-color)] bg-gradient-to-r from-[#f5ead5] via-[#fdf8ed] to-[#f2e3c6] p-6 shadow-[0_18px_60px_-30px_rgba(92,67,31,0.72)]"
        >
          <div className="pointer-events-none absolute -right-24 -top-16 h-48 w-48 rounded-full bg-[#cfa968]/25 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-[#b98b44]/20 blur-3xl" />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Welcome back</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
                {data.userName}&apos;s Engineering Dashboard
              </h1>
              <p className="mt-2 max-w-2xl text-sm md:text-base text-[var(--text-secondary)]">
                Your performance command center across problems, patterns, momentum, and contest readiness.
              </p>
            </div>
          </div>
        </motion.div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Problems Solved"
            value={data.totalSolved}
            icon={Trophy}
            tone="violet"
            tooltip="Total problems solved"
          />
          <StatCard
            title="Easy"
            value={data.byDifficulty.Easy}
            icon={CheckCircle2}
            tone="emerald"
            tooltip="Easy problems solved"
          />
          <StatCard
            title="Medium"
            value={data.byDifficulty.Medium}
            icon={AlertCircle}
            tone="amber"
            tooltip="Medium problems solved"
          />
          <StatCard
            title="Hard"
            value={data.byDifficulty.Hard}
            icon={XCircle}
            tone="rose"
            tooltip="Hard problems solved"
          />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <ChartCard
            title="Difficulty Distribution"
            subtitle="Share of accepted problems by difficulty"
            action={<Target className="h-4 w-4 text-[var(--accent-muted)]" />}
          >
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={difficultyData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={72}
                    outerRadius={108}
                    paddingAngle={4}
                    strokeWidth={2}
                    animationDuration={900}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {difficultyData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "0.75rem",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {difficultyData.map((item) => (
                <div key={item.name} className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1 text-xs text-[var(--text-secondary)]">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name} {item.value}
                </div>
              ))}
            </div>
          </ChartCard>

          <ChartCard
            title="Topics Breakdown"
            subtitle="Top concepts by solved frequency"
            action={<BarChart3 className="h-4 w-4 text-[var(--accent-muted)]" />}
          >
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topicData} layout="vertical" margin={{ left: 16, right: 8 }}>
                  <CartesianGrid stroke="rgba(148,163,184,.1)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "#cbd5e1", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={115}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "0.75rem",
                    }}
                  />
                  <Bar dataKey="solved" radius={[8, 8, 8, 8]} animationDuration={850}>
                    {topicData.map((topic, idx) => (
                      <Cell
                        key={topic.name}
                        fill={idx % 2 === 0 ? "#8b5cf6" : "#38bdf8"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </section>

        <section className="mt-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-5 shadow-[0_18px_40px_-30px_rgba(92,67,31,0.62)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">Overall Progress</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {data.totalSolved}/{data.totalProblems} problems solved
              </p>
            </div>
            <span className="rounded-full border border-[#b89457]/45 bg-[#efe3cd] px-3 py-1 text-sm font-medium text-[#7a5b2b]">
              {progressPercent}% complete
            </span>
          </div>

          <div className="relative h-4 overflow-hidden rounded-full bg-[var(--border-color)]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-[#c59a56] via-[#ab7f3f] to-[#8f6f3b]"
            />

            {milestones.map((milestone) => (
              <div
                key={milestone}
                className="absolute top-0 h-full w-px bg-[#c9b490]"
                style={{ left: `${milestone}%` }}
                title={`${milestone}%`}
              />
            ))}
          </div>

          <div className="mt-2 flex justify-between text-xs text-[var(--text-muted)]">
            <span>Start</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>Goal</span>
          </div>
        </section>

        {/* Activity Heatmap */}
        <section className="mt-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">Activity</h3>
            <p className="text-sm text-[var(--text-secondary)]">Your submission activity over the year</p>
          </div>
          <ActivityHeatmap
            data={heatmapQuery.data || []}
            year={new Date().getFullYear()}
          />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <ChartCard
            title="Recommended Problems"
            subtitle="Precision picks for your next growth loop"
            action={<Sparkles className="h-4 w-4 text-[var(--accent-muted)]" />}
          >
            {data.recommendations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] p-8 text-center text-sm text-[var(--text-secondary)]">
                No recommendations yet. Solve 5 more problems to personalize this feed.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {data.recommendations.map((problem) => (
                  <ProblemCard key={problem.id} problem={problem} />
                ))}
              </div>
            )}
          </ChartCard>

          <div className="grid gap-6">
            <ChartCard title="Daily Streak" subtitle="Consistency compounds quickly" action={<Flame className="h-4 w-4 text-[#c98a2b]" />}>
              <div className="flex items-center justify-between rounded-xl border border-[#d7b07a] bg-[#f3e6d2] p-4">
                <div>
                  <p className="text-3xl font-semibold text-[var(--text-primary)]">{data.streakDays} days</p>
                  <p className="mt-1 text-sm text-[#8c5c26]">Keep it up! You are in rhythm.</p>
                </div>
                <Flame className="h-10 w-10 text-[#c98a2b]" />
              </div>
            </ChartCard>

            <ChartCard title="Contest Performance" subtitle="Rating trend preview" action={<Activity className="h-4 w-4 text-[var(--accent-muted)]" />}>
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                <p className="text-sm text-[var(--text-secondary)]">Live rating graph integration coming in next iteration.</p>
                <div className="mt-3 flex h-20 items-end gap-1">
                  {[8, 15, 22, 16, 28, 34, 30, 36].map((h, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ height: 0 }}
                      animate={{ height: `${h * 2}px` }}
                      transition={{ duration: 0.35, delay: idx * 0.05 }}
                      className="w-3 rounded-sm bg-gradient-to-t from-[#c59a56] to-[#8f6f3b]"
                    />
                  ))}
                </div>
              </div>
            </ChartCard>
          </div>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <ChartCard title="Recent Activity" subtitle="Last 5 solved problems" action={<AlarmClock className="h-4 w-4 text-[var(--accent-muted)]" />}>
            {data.recentActivity.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border-color)] p-6 text-center text-sm text-[var(--text-secondary)]">
                Start solving to populate your activity timeline.
              </div>
            ) : (
              <ul className="space-y-3">
                {data.recentActivity.map((item) => (
                  <li key={item.id} className="flex items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2">
                    <span className="text-sm text-[var(--text-primary)]">{item.title}</span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      {formatDistanceToNow(new Date(item.solvedAt), { addSuffix: true })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>

          <ChartCard title="Achievements" subtitle="Milestones and badges" action={<Medal className="h-4 w-4 text-yellow-300" />}>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`rounded-xl border p-3 ${
                    achievement.earned
                      ? "border-[#9ed6b7] bg-[#e8f7ed]"
                      : "border-[var(--border-color)] bg-[var(--bg-secondary)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Trophy className={`h-4 w-4 ${achievement.earned ? "text-[#2f6f4e]" : "text-[var(--text-muted)]"}`} />
                    <p className="text-sm font-medium text-[var(--text-primary)]">{achievement.title}</p>
                  </div>
                  <p className={`mt-1 text-xs ${achievement.earned ? "text-[#21573d]" : "text-[var(--text-secondary)]"}`}>
                    {achievement.detail}
                  </p>
                </div>
              ))}
            </div>
          </ChartCard>
        </section>
      </div>
    </div>
  );
}
