"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, BrainCircuit, Loader2, Sparkles, Target } from "lucide-react";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";
import { authApi } from "@/src/api/authApi";
import WeakTopicCard from "@/src/components/weakness/WeakTopicCard";
import RecommendedProblemCard from "@/src/components/weakness/RecommendedProblemCard";

type TopicRow = {
  topic: string;
  accuracy: number;
  attempts: number;
};

type RecommendedProblem = {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  tags: string[];
};

type WeaknessResponse = {
  weak_topics: TopicRow[];
  strong_topics: TopicRow[];
  recommended_problems: RecommendedProblem[];
  strategy: string;
};

export default function WeaknessPage() {
  const { ready } = useProtectedRoute();

  const weaknessQuery = useQuery<WeaknessResponse>({
    queryKey: ["weakness-report"],
    queryFn: async () => (await authApi.weaknessReport()).data,
    enabled: ready,
    retry: 1,
  });

  const report = weaknessQuery.data;
  const weakTopics = report?.weak_topics || [];
  const strongTopics = report?.strong_topics || [];
  const recommendedProblems = report?.recommended_problems || [];

  if (!ready || weaknessQuery.isLoading) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-7xl items-center justify-center px-4 py-8 sm:px-6">
        <div className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading weakness report...
        </div>
      </div>
    );
  }

  if (weaknessQuery.isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6">
          <div className="flex items-center gap-2 text-rose-300">
            <AlertCircle className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Could not load weakness report</h1>
          </div>
          <p className="mt-2 text-sm text-rose-200/90">
            Please refresh the page or try again after submitting a few problems.
          </p>
        </div>
      </div>
    );
  }

  const noData =
    weakTopics.length === 0 &&
    strongTopics.length === 0 &&
    recommendedProblems.length === 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <section className="rounded-2xl border border-[var(--border-color)] bg-gradient-to-r from-indigo-500/15 via-cyan-500/10 to-emerald-500/15 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <BrainCircuit className="h-6 w-6 text-[var(--accent-secondary)]" />
              Weakness Report
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
              Track weaker topics, keep your strengths warm, and solve targeted problems to improve faster.
            </p>
          </div>
        </div>
      </section>

      {noData ? (
        <section className="mt-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">No data yet.</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Submit a few tagged problems and your personalized report will appear here.
          </p>
        </section>
      ) : (
        <>
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Target className="h-5 w-5 text-amber-300" />
                Weak Topics
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Lowest accuracy concepts based on your submissions.</p>
              <div className="mt-4 space-y-3">
                {weakTopics.length ? (
                  weakTopics.map((item) => (
                    <WeakTopicCard
                      key={`weak-${item.topic}`}
                      topic={item.topic}
                      accuracy={item.accuracy}
                      attempts={item.attempts}
                      type="weak"
                    />
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">No weak topics detected yet.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Sparkles className="h-5 w-5 text-emerald-300" />
                Strong Topics
              </h2>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">Topics where your accuracy is consistently high.</p>
              <div className="mt-4 space-y-3">
                {strongTopics.length ? (
                  strongTopics.map((item) => (
                    <WeakTopicCard
                      key={`strong-${item.topic}`}
                      topic={item.topic}
                      accuracy={item.accuracy}
                      attempts={item.attempts}
                      type="strong"
                    />
                  ))
                ) : (
                  <p className="text-sm text-[var(--text-muted)]">No strong topics yet. Keep practicing.</p>
                )}
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5">
            <h2 className="text-lg font-semibold">Recommended Problems</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Problems selected from your weak topics and unsolved set.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {recommendedProblems.length ? (
                recommendedProblems.map((problem) => (
                  <RecommendedProblemCard
                    key={problem.id}
                    title={problem.title}
                    slug={problem.slug}
                    difficulty={problem.difficulty}
                    tags={problem.tags}
                  />
                ))
              ) : (
                <p className="text-sm text-[var(--text-muted)]">No recommended problems available yet.</p>
              )}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-5">
            <h2 className="text-lg font-semibold text-cyan-200">Strategy</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-cyan-100/90">
              {report?.strategy || "Keep solving problems and return here for a personalized strategy."}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
