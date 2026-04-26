"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlarmClock,
  BrainCircuit,
  Flame,
  Sparkles,
  Trophy,
  Medal,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";
import { authApi } from "@/src/api/authApi";
import { userApi } from "@/src/api/userApi";
import { problemApi } from "@/src/api/problemApi";
import { interviewApi, InterviewHistoryItem } from "@/src/api/interviewApi";
import { useAuthContext } from "@/src/context/AuthContext";
import ChartCard from "@/src/components/dashboard/ChartCard";
import ProblemCard from "@/src/components/dashboard/ProblemCard";
import DashboardSkeleton from "@/src/components/dashboard/DashboardSkeleton";
import ActivityHeatmap from "@/src/components/dashboard/ActivityHeatmap";
import AttemptEfficiencyChart from "@/src/components/dashboard/AttemptEfficiencyChart";
import TopicProgressChart from "@/src/components/dashboard/TopicProgressChart";
import AccuracyTrendChart from "@/src/components/dashboard/AccuracyTrendChart";
import SolveSpeedChart from "@/src/components/dashboard/SolveSpeedChart";
import InsightCards from "@/src/components/dashboard/InsightCards";
import DynamicMilestones from "@/src/components/dashboard/DynamicMilestones";
import { DashboardMockData, RecommendedProblem } from "@/src/data/dashboardMock";

const difficultyAccent = {
  Easy: "#10b8b0",
  Medium: "#f3a301",
  Hard: "#ff4040",
};

type DashboardSubmission = {
  _id?: string;
  verdict?: string;
  createdAt: string;
  problem?: {
    title?: string;
  };
};

type RecommendationSuggestion = {
  _id?: string;
  id?: string;
  title?: string;
  slug?: string;
  difficulty?: string;
  tags?: string[];
  confidenceScore?: number;
  recommendationTag?: "Fix Weakness" | "Level Up";
};

type InterviewDifficulty = "Easy" | "Medium" | "Hard";

type InterviewDifficultyRow = {
  difficulty: InterviewDifficulty;
  count: number;
  averageScore: number;
};

const normalizeDifficulty = (value: unknown): RecommendedProblem["difficulty"] => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "easy") return "Easy";
  if (normalized === "hard") return "Hard";
  return "Medium";
};

const toDateKey = (value: string | Date) => new Date(value).toISOString().slice(0, 10);

const computeStreak = (submissions: DashboardSubmission[]) => {
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
  const router = useRouter();
  const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);
  const [selectedInterviewDifficulty, setSelectedInterviewDifficulty] = useState<InterviewDifficulty | "all">("all");

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

  const interviewStatsQuery = useQuery({
    queryKey: ["interview-stats-dashboard"],
    queryFn: async () => (await interviewApi.getStats()).data,
    retry: 1,
  });

  const interviewHistoryQuery = useQuery({
    queryKey: ["interview-history-dashboard", selectedInterviewDifficulty],
    queryFn: async () =>
      (
        await interviewApi.getHistory({
          page: 1,
          limit: 50,
          status: "all",
          difficulty: selectedInterviewDifficulty,
        })
      ).data,
    enabled: isInterviewModalOpen,
    retry: 1,
  });

  const statusesQuery = useQuery({
    queryKey: ["problem-statuses-dashboard"],
    queryFn: async () => (await userApi.problemStatuses()).data as Array<{
      problemId: string;
      isBookmarked: boolean;
    }>,
    staleTime: 1000 * 60 * 2,
    retry: false,
  });

  const bookmarkedSet = useMemo(() => {
    const set = new Set<string>();
    (statusesQuery.data || []).forEach((s) => {
      if (s.isBookmarked) set.add(s.problemId);
    });
    return set;
  }, [statusesQuery.data]);

  const loading =
    dashboardQuery.isLoading || recommendationsQuery.isLoading || recentQuery.isLoading;

  const data = useMemo<DashboardMockData>(() => {
    const stats = dashboardQuery.data || {};
    const rec = recommendationsQuery.data || {};
    const allSubmissions: DashboardSubmission[] = recentQuery.data?.items || [];
    const profile = profileQuery.data || {};
    const weakTopicSet = new Set(
      (rec?.weakTopics || []).map((topic: string) => String(topic).trim().toLowerCase())
    );
    const normalizedTargetDifficulty = String(rec?.targetDifficulty || "").trim().toLowerCase();

    const recommended: RecommendedProblem[] =
      (rec?.suggestions || []).map((item: RecommendationSuggestion) => ({
        id: String(item._id || item.id),
        title: item.title || "Recommended Problem",
        slug: item.slug || "",
        difficulty: normalizeDifficulty(item.difficulty),
        tags: item.tags || [],
        bookmarked: bookmarkedSet.has(String(item._id || item.id)),
        confidenceScore: Number.isFinite(Number(item.confidenceScore))
          ? Number(item.confidenceScore)
          : (() => {
              const tags = Array.isArray(item.tags) ? item.tags : [];
              const topicMatch = tags.some((tag: string) => weakTopicSet.has(String(tag).trim().toLowerCase()));
              const difficultyMatch =
                String(item.difficulty || "").trim().toLowerCase() === normalizedTargetDifficulty;

              const score =
                62 + (topicMatch ? 20 : 0) + (difficultyMatch ? 10 : 0) + Math.min(tags.length, 3);
              return Math.max(62, Math.min(95, score));
            })(),
        recommendationTag: item.recommendationTag || (() => {
          const tags = Array.isArray(item.tags) ? item.tags : [];
          const topicMatch = tags.some((tag: string) => weakTopicSet.has(String(tag).trim().toLowerCase()));
          return topicMatch ? "Fix Weakness" : "Level Up";
        })(),
      })) || [];

    const solved = Number(stats?.totalSolved ?? profile?.totalSolved ?? 0);
    const easy = Number(stats?.byDifficulty?.Easy ?? profile?.easyCount ?? 0);
    const medium = Number(stats?.byDifficulty?.Medium ?? profile?.mediumCount ?? 0);
    const hard = Number(stats?.byDifficulty?.Hard ?? profile?.hardCount ?? 0);
    const easyTotal = Number(stats?.byDifficultyTotals?.Easy ?? 0);
    const mediumTotal = Number(stats?.byDifficultyTotals?.Medium ?? 0);
    const hardTotal = Number(stats?.byDifficultyTotals?.Hard ?? 0);
    const totalFromDifficulty = easyTotal + mediumTotal + hardTotal;
    const totalProblems = Number(
      totalFromDifficulty > 0
        ? totalFromDifficulty
        : (stats?.totalProblems ?? 500)
    );

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
      totalProblems,
      streakDays,
      byDifficulty: {
        Easy: easy,
        Medium: medium,
        Hard: hard,
      },
      byDifficultyTotals: {
        Easy: easyTotal,
        Medium: mediumTotal,
        Hard: hardTotal,
      },
      attemptingCount: Number(stats?.attemptingCount ?? 0),
      byTopic:
        stats?.byTopic && Object.keys(stats.byTopic).length > 0
          ? stats.byTopic
          : {},
      byTopicTotals:
        stats?.byTopicTotals && Object.keys(stats.byTopicTotals).length > 0
          ? stats.byTopicTotals
          : {},
      recommendations: recommended.length > 0 ? recommended : [],
      recentActivity:
        allSubmissions.length > 0
          ? allSubmissions.slice(0, 5).map((item: DashboardSubmission) => ({
              id: String(item._id),
              title: item.problem?.title || "Solved Problem",
              solvedAt: item.createdAt,
            }))
          : [],
      achievements,
    };
  }, [dashboardQuery.data, recommendationsQuery.data, recentQuery.data, profileQuery.data, user?.name, bookmarkedSet]);

  const difficultyBreakdown = useMemo(
    () => [
      {
        name: "Easy",
        solved: data.byDifficulty.Easy,
        total: data.byDifficultyTotals.Easy > 0 ? data.byDifficultyTotals.Easy : data.byDifficulty.Easy,
      },
      {
        name: "Medium",
        solved: data.byDifficulty.Medium,
        total: data.byDifficultyTotals.Medium > 0 ? data.byDifficultyTotals.Medium : data.byDifficulty.Medium,
      },
      {
        name: "Hard",
        solved: data.byDifficulty.Hard,
        total: data.byDifficultyTotals.Hard > 0 ? data.byDifficultyTotals.Hard : data.byDifficulty.Hard,
      },
    ],
    [data.byDifficulty, data.byDifficultyTotals]
  );

  const topicProgressRows = useMemo(
    () =>
      Object.entries(data.byTopic)
        .map(([name, solved]) => {
          const total = Number(data.byTopicTotals?.[name] ?? solved);
          return {
            name,
            solved,
            total: Math.max(total, solved),
          };
        })
        .sort((a, b) => b.solved - a.solved)
        .slice(0, 6),
    [data.byTopic, data.byTopicTotals]
  );

  const interviewRows = useMemo<InterviewDifficultyRow[]>(() => {
    const defaultRows: InterviewDifficultyRow[] = [
      { difficulty: "Easy", count: 0, averageScore: 0 },
      { difficulty: "Medium", count: 0, averageScore: 0 },
      { difficulty: "Hard", count: 0, averageScore: 0 },
    ];

    const rawRows = interviewStatsQuery.data?.difficultyBreakdown;
    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return defaultRows;
    }

    const rowMap: Record<InterviewDifficulty, InterviewDifficultyRow> = {
      Easy: defaultRows[0],
      Medium: defaultRows[1],
      Hard: defaultRows[2],
    };

    rawRows.forEach((row) => {
      if (!row || !(row.difficulty in rowMap)) return;
      const difficulty = row.difficulty as InterviewDifficulty;
      rowMap[difficulty] = {
        difficulty,
        count: Number(row.count || 0),
        averageScore: Number(row.averageScore || 0),
      };
    });

    return [rowMap.Easy, rowMap.Medium, rowMap.Hard];
  }, [interviewStatsQuery.data]);

  const averageInterviewScore = Number(
    interviewStatsQuery.data?.averageScoreAll ?? interviewStatsQuery.data?.averageScore ?? 0
  );
  const totalInterviewSessions = Number(interviewStatsQuery.data?.totalSessions || 0);

  const openInterviewModal = (difficulty: InterviewDifficulty | "all") => {
    setSelectedInterviewDifficulty(difficulty);
    setIsInterviewModalOpen(true);
  };

  const interviewListItems: InterviewHistoryItem[] = useMemo(() => {
    const items: InterviewHistoryItem[] = interviewHistoryQuery.data?.items || [];
    if (selectedInterviewDifficulty === "all") return items;

    return items.filter(
      (session) => session.problem?.difficulty === selectedInterviewDifficulty
    );
  }, [interviewHistoryQuery.data?.items, selectedInterviewDifficulty]);

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
        {/* AI Insight Cards */}
        <section>
          <InsightCards />
        </section>

        <section className="mt-6 grid items-start gap-6 xl:grid-cols-2">
          <ChartCard
            title="Progress Overview"
            subtitle="A classic snapshot of solved progress and difficulty coverage"
          >
            <div className="grid gap-4 md:grid-cols-[1.15fr_1fr]">
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">Solved Progress</p>
                <p className="mt-2 tabular-nums text-4xl font-semibold leading-none text-[var(--text-primary)]">
                  {data.totalSolved}
                  <span className="mx-1 text-3xl">/</span>
                  <span className="text-2xl text-[var(--text-secondary)]">{data.totalProblems}</span>
                </p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {data.attemptingCount} currently attempting
                </p>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--border-color)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#d9b572] to-[#8f6f3b]"
                    style={{
                      width: `${Math.min(100, Math.round((data.totalSolved / Math.max(data.totalProblems, 1)) * 100))}%`,
                    }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                  <span>Total solved</span>
                  <span>{Math.min(100, Math.round((data.totalSolved / Math.max(data.totalProblems, 1)) * 100))}%</span>
                </div>
              </div>

              <div className="flex flex-col justify-center gap-2">
                {difficultyBreakdown.map((item) => (
                  <div
                    key={item.name}
                    className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-semibold" style={{ color: difficultyAccent[item.name as keyof typeof difficultyAccent] }}>
                        {item.name}
                      </span>
                      <span className="tabular-nums text-sm font-semibold text-[var(--text-primary)]">
                        {item.solved}/{item.total}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border-color)]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${item.total > 0 ? Math.min(100, Math.round((item.solved / item.total) * 100)) : 0}%`,
                          backgroundColor: difficultyAccent[item.name as keyof typeof difficultyAccent],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          <ChartCard
            title="Interview Report"
            subtitle="Average score across all interviews with difficulty-wise insights"
            action={<BrainCircuit className="h-4 w-4 text-[var(--accent-muted)]" />}
          >
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--text-secondary)]">Overall Average Score</p>
              <p className="mt-2 tabular-nums text-4xl font-semibold leading-none text-[var(--text-primary)]">
                {averageInterviewScore}%
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {totalInterviewSessions} interviews recorded
              </p>
              <button
                type="button"
                onClick={() => openInterviewModal("all")}
                className="mt-3 inline-flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)]"
              >
                View all interviews
              </button>
            </div>

            <div className="mt-4 space-y-2.5">
              {interviewRows.map((row) => (
                <button
                  key={row.difficulty}
                  type="button"
                  onClick={() => openInterviewModal(row.difficulty)}
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2 text-left transition hover:bg-[var(--bg-tertiary)]"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{ color: difficultyAccent[row.difficulty] }}>
                      {row.difficulty}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">{row.count} interviews</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <span>Average score</span>
                    <span className="tabular-nums font-semibold text-[var(--text-primary)]">{row.averageScore}%</span>
                  </div>
                </button>
              ))}
            </div>

            <p className="mt-3 text-xs text-[var(--text-secondary)]">
              Click any difficulty row to view corresponding interview sessions and open a session directly.
            </p>
          </ChartCard>
        </section>

        <section className="mt-5 max-w-3xl">
          <ChartCard title="Topicwise Progress" subtitle="Classic compact view">
            {topicProgressRows.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">No topic progress available yet.</p>
            ) : (
              <ul className="divide-y divide-[var(--border-color)] overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
                {topicProgressRows.map((topic) => (
                  <li
                    key={`progress-${topic.name}`}
                    className="flex items-center justify-between px-3 py-1.5"
                  >
                    <span className="truncate pr-3 text-[13px] font-medium text-[var(--text-primary)]">{topic.name}</span>
                    <span className="whitespace-nowrap text-[12px] text-[var(--text-secondary)]">
                      {topic.solved}/{topic.total} solved
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>
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

        {/* New Analytics Charts */}
        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <AttemptEfficiencyChart />
          <AccuracyTrendChart />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-2">
          <TopicProgressChart />
          <SolveSpeedChart />
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

        {/* Dynamic Milestones */}
        <section className="mt-6">
          <DynamicMilestones />
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

        {isInterviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close interview report"
              onClick={() => setIsInterviewModalOpen(false)}
              className="absolute inset-0 bg-black/55"
            />

            <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-4">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">Interview Sessions</h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {selectedInterviewDifficulty === "all"
                      ? "Showing all interview sessions"
                      : `Showing ${selectedInterviewDifficulty} interview sessions`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInterviewModalOpen(false)}
                  className="rounded-md p-1 text-[var(--text-secondary)] transition hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
                {interviewHistoryQuery.isLoading ? (
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">
                    Loading interview sessions...
                  </div>
                ) : interviewListItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 text-center text-sm text-[var(--text-secondary)]">
                    No interviews found for this filter.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {interviewListItems.map((session) => {
                      const difficulty = session.problem?.difficulty as InterviewDifficulty | undefined;
                      const difficultyColor = difficulty ? difficultyAccent[difficulty] : "#94a3b8";

                      return (
                        <button
                          key={session.sessionId}
                          type="button"
                          onClick={() => {
                            setIsInterviewModalOpen(false);
                            router.push(`/interview/${session.sessionId}`);
                          }}
                          className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-3 text-left transition hover:bg-[var(--bg-tertiary)]"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                              {session.problem?.title || "Interview Session"}
                            </p>
                            <span className="text-xs text-[var(--text-secondary)]">
                              {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                            <span
                              className="rounded-full px-2 py-0.5 font-semibold"
                              style={{ backgroundColor: `${difficultyColor}22`, color: difficultyColor }}
                            >
                              {difficulty || "Unknown"}
                            </span>
                            <span className="rounded-full border border-[var(--border-color)] px-2 py-0.5">
                              {session.status}
                            </span>
                            <span>Score: {session.score}%</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
