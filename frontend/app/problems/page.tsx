"use client";

import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { Search, Filter, Tag, CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { problemApi } from "@/src/api/problemApi";
import { ProblemListSkeleton } from "@/src/components/ui/Skeleton";
import ErrorState from "@/src/components/ui/ErrorState";
import { DifficultyBadge } from "@/src/components/ui/Badge";

const difficulties = ["", "Easy", "Medium", "Hard"] as const;

export default function ProblemsPage() {
  const [filters, setFilters] = useState({ difficulty: "", tags: "", search: "" });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["problems", filters],
    queryFn: async () => (await problemApi.list(filters)).data,
  });

  const problems = data?.items || [];

  const submissionsQuery = useQuery({
    queryKey: ["my-submissions-progress"],
    queryFn: async () => (await problemApi.mySubmissions({ page: 1, limit: 1000 })).data,
    retry: false,
  });

  const progressByProblem = useMemo(() => {
    const statusMap = new Map<string, "accepted" | "attempted">();
    const items = submissionsQuery.data?.items || submissionsQuery.data || [];

    items.forEach((submission: any) => {
      const problemId = submission?.problem?._id || submission?.problem;
      if (!problemId) return;

      const key = String(problemId);
      const isAccepted = submission?.verdict === "Accepted";

      if (isAccepted) {
        statusMap.set(key, "accepted");
        return;
      }

      if (!statusMap.has(key)) {
        statusMap.set(key, "attempted");
      }
    });

    return statusMap;
  }, [submissionsQuery.data]);

  const stats = useMemo(() => {
    const all = problems.length;
    const easy = problems.filter((p: any) => p.difficulty === "Easy").length;
    const medium = problems.filter((p: any) => p.difficulty === "Medium").length;
    const hard = problems.filter((p: any) => p.difficulty === "Hard").length;
    return { all, easy, medium, hard };
  }, [problems]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    problems.forEach((p: any) => (p.tags || []).forEach((t: string) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [problems]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Problems</h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Practice coding challenges to sharpen your skills
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-secondary)] px-4 py-2 text-sm">
          <span className="text-[var(--text-muted)]">All</span>
          <span className="rounded-full bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs font-medium">
            {stats.all}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">
          <span>Easy</span>
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium">
            {stats.easy}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-4 py-2 text-sm text-amber-400">
          <span>Medium</span>
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium">
            {stats.medium}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 px-4 py-2 text-sm text-rose-400">
          <span>Hard</span>
          <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-medium">
            {stats.hard}
          </span>
        </div>
      </div>

      <div className="card mb-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search problems..."
              className="input !pl-10"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <select
              value={filters.difficulty}
              onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
              className="input select !pl-10"
            >
              <option value="">All Difficulties</option>
              {difficulties.slice(1).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={filters.tags}
              onChange={(e) => setFilters({ ...filters, tags: e.target.value })}
              placeholder="Filter by tags (comma separated)"
              className="input !pl-10"
              list="tag-suggestions"
            />
            <datalist id="tag-suggestions">
              {allTags.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
          </div>
        </div>
      </div>

      {isLoading && <ProblemListSkeleton />}

      {isError && <ErrorState message="Failed to load problems" />}

      {!isLoading && !isError && problems.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 rounded-full bg-[var(--bg-tertiary)] p-4">
            <Search className="h-8 w-8 text-[var(--text-muted)]" />
          </div>
          <h3 className="text-lg font-semibold">No problems found</h3>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Try adjusting your filters or search terms
          </p>
          <button
            onClick={() => setFilters({ difficulty: "", tags: "", search: "" })}
            className="btn btn-secondary mt-4"
          >
            Clear filters
          </button>
        </div>
      )}

      {!isLoading && !isError && problems.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-[var(--border-color)]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Title
                </th>
                <th className="hidden px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] md:table-cell">
                  Tags
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                  Difficulty
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)] bg-[var(--bg-primary)]">
              {problems.map((problem: any, idx: number) => (
                
                <tr
                  key={problem._id}
                  className={clsx(
                    "group transition-colors hover:bg-[var(--bg-secondary)]",
                    idx % 2 === 0 ? "bg-[var(--bg-primary)]" : "bg-[var(--bg-secondary)]/30"
                  )}
                >
                  <td className="px-4 py-4">
                    {progressByProblem.get(String(problem._id)) === "accepted" ? (
                      <span title="Solved" className="inline-flex">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      </span>
                    ) : progressByProblem.get(String(problem._id)) === "attempted" ? (
                      <span title="Attempted" className="inline-flex">
                        <Circle className="h-5 w-5 text-amber-400" />
                      </span>
                    ) : (
                      <span title="Not started" className="inline-flex">
                        <Circle className="h-5 w-5 text-[var(--text-muted)]" />
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm font-mono text-[var(--text-secondary)]">
                    {problem.questionNumber || "-"}
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/problems/${problem.slug}`}
                      className="font-medium text-[var(--text-primary)] hover:text-[var(--accent-secondary)]"
                    >
                      {problem.title}
                    </Link>
                    {problem.hiddenTestCaseCount ? (
                      <div className="mt-1 text-xs text-[var(--text-muted)]">
                        {problem.hiddenTestCaseCount} hidden tests
                      </div>
                    ) : null}
                  </td>
                  <td className="hidden px-4 py-4 md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(problem.tags || []).slice(0, 3).map((tag: string) => (
                        <span
                          key={tag}
                          className="rounded-md bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
                        >
                          {tag}
                        </span>
                      ))}
                      {(problem.tags || []).length > 3 && (
                        <span className="text-xs text-[var(--text-muted)]">
                          +{problem.tags.length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <DifficultyBadge difficulty={problem.difficulty} />
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/problems/${problem.slug}`}
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <ChevronRight className="h-5 w-5 text-[var(--text-muted)]" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
