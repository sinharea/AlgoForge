"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Database, Layers, Shell, Sparkles, SplitSquareHorizontal } from "lucide-react";
import ErrorState from "@/src/components/ui/ErrorState";
import { ProblemListSkeleton } from "@/src/components/ui/Skeleton";
import { problemApi } from "@/src/api/problemApi";
import { userApi } from "@/src/api/userApi";
import CompanySidebar from "./CompanySidebar";
import FilterBar from "./FilterBar";
import ProblemTable from "./ProblemTable";
import TagBar from "./TagBar";
import {
  ApiProblem,
  CATEGORY_TABS,
  DEFAULT_TOPIC_TAGS,
  getBaseProblemCatalog,
  getDifficultyRank,
} from "./problemCatalog";
import useDebouncedValue from "./useDebouncedValue";
import {
  Difficulty,
  ProblemCategory,
  ProblemFiltersState,
  ProblemSort,
  ProblemStatus,
  ProblemViewItem,
} from "./types";

const FAVORITES_STORAGE_KEY = "algoforge.problem-favorites";
const SOLVED_OVERRIDES_STORAGE_KEY = "algoforge.problem-solved-overrides";
const PAGE_SIZE = 100;
const MAX_PAGE_COUNT = 30;

type ProblemListResponse = {
  items?: ApiProblem[];
  pages?: number;
};

type SubmissionRow = {
  problem?: string | { _id?: string };
  verdict?: string;
};

type SubmissionListResponse = {
  items?: SubmissionRow[];
  pages?: number;
};

const parseStoredStringList = (rawValue: string | null): string[] => {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
};

const parseStoredBooleanMap = (rawValue: string | null): Record<string, boolean> => {
  if (!rawValue) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed).reduce<Record<string, boolean>>((result, [key, value]) => {
      if (typeof value === "boolean") {
        result[key] = value;
      }
      return result;
    }, {});
  } catch {
    return {};
  }
};

const toggleInArray = <T,>(items: T[], value: T): T[] =>
  items.includes(value) ? items.filter((item) => item !== value) : [...items, value];

const getStatusIcon = (category: ProblemCategory) => {
  if (category === "Database") return Database;
  if (category === "Shell") return Shell;
  if (category === "Concurrency") return SplitSquareHorizontal;
  return Layers;
};

const fetchAllProblems = async (): Promise<ApiProblem[]> => {
  const catalog: ApiProblem[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= MAX_PAGE_COUNT) {
    const response = (await problemApi.list({ page, limit: PAGE_SIZE })).data as ProblemListResponse;
    const items = response.items || [];
    catalog.push(...items);

    const pages = Number(response.pages || 1);
    totalPages = Number.isFinite(pages) && pages > 0 ? pages : 1;
    page += 1;
  }

  const seen = new Set<string>();
  return catalog.filter((problem) => {
    if (seen.has(problem._id)) {
      return false;
    }
    seen.add(problem._id);
    return true;
  });
};

const fetchSolvedProblemIds = async (): Promise<string[]> => {
  try {
    const solved = new Set<string>();
    let page = 1;
    let totalPages = 1;

    while (page <= totalPages && page <= MAX_PAGE_COUNT) {
      const response = (await problemApi.mySubmissions({ page, limit: PAGE_SIZE })).data as SubmissionListResponse;
      const items = response.items || [];

      items.forEach((submission) => {
        if (submission.verdict !== "Accepted") {
          return;
        }

        if (typeof submission.problem === "string") {
          solved.add(submission.problem);
          return;
        }

        if (submission.problem?._id) {
          solved.add(submission.problem._id);
        }
      });

      const pages = Number(response.pages || 1);
      totalPages = Number.isFinite(pages) && pages > 0 ? pages : 1;
      page += 1;
    }

    return Array.from(solved);
  } catch {
    return [];
  }
};

export default function ProblemsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [sortBy, setSortBy] = useState<ProblemSort>("id");
  const [category, setCategory] = useState<ProblemCategory>("All Topics");
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }
    return parseStoredStringList(window.localStorage.getItem(FAVORITES_STORAGE_KEY));
  });
  const [solvedOverrides, setSolvedOverrides] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") {
      return {};
    }
    return parseStoredBooleanMap(window.localStorage.getItem(SOLVED_OVERRIDES_STORAGE_KEY));
  });
  const [filters, setFilters] = useState<ProblemFiltersState>({
    difficulty: [],
    topics: [],
    status: null,
    company: [],
    showFavorites: false,
  });

  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const problemsQuery = useQuery({
    queryKey: ["problem-browser-catalog"],
    queryFn: fetchAllProblems,
    staleTime: 1000 * 60 * 5,
  });

  const solvedQuery = useQuery({
    queryKey: ["problem-browser-solved-ids"],
    queryFn: fetchSolvedProblemIds,
    staleTime: 1000 * 60 * 2,
    retry: false,
  });

  // Fetch server-side problem statuses (favorites, bookmarks, solved)
  const statusesQuery = useQuery({
    queryKey: ["problem-statuses"],
    queryFn: async () => (await userApi.problemStatuses()).data as Array<{
      problemId: string;
      status: string;
      isFavorited: boolean;
      isBookmarked: boolean;
    }>,
    staleTime: 1000 * 60 * 2,
    retry: false,
  });

  useEffect(() => {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  useEffect(() => {
    window.localStorage.setItem(SOLVED_OVERRIDES_STORAGE_KEY, JSON.stringify(solvedOverrides));
  }, [solvedOverrides]);

  const showLoading = problemsQuery.isLoading && !problemsQuery.data;

  const baseCatalog = useMemo(
    () => getBaseProblemCatalog(problemsQuery.data || []),
    [problemsQuery.data]
  );

  const serverSolvedSet = useMemo(() => new Set(solvedQuery.data || []), [solvedQuery.data]);

  // Merge server-side favorites with localStorage fallback
  const favoriteSet = useMemo(() => {
    const set = new Set(favoriteIds);
    (statusesQuery.data || []).forEach((s) => {
      if (s.isFavorited) set.add(s.problemId);
    });
    return set;
  }, [favoriteIds, statusesQuery.data]);

  const solvedSet = useMemo(() => {
    const merged = new Set(serverSolvedSet);

    // Merge server-side solved statuses
    (statusesQuery.data || []).forEach((s) => {
      if (s.status === "solved") merged.add(s.problemId);
    });

    Object.entries(solvedOverrides).forEach(([problemId, status]) => {
      if (status) {
        merged.add(problemId);
      } else {
        merged.delete(problemId);
      }
    });

    return merged;
  }, [serverSolvedSet, solvedOverrides, statusesQuery.data]);

  const allProblems = useMemo<ProblemViewItem[]>(
    () =>
      baseCatalog.map((problem) => ({
        ...problem,
        solved: solvedSet.has(problem.id),
        favorite: favoriteSet.has(problem.id),
      })),
    [baseCatalog, solvedSet, favoriteSet]
  );

  const topicOptions = useMemo(() => {
    const topics = new Set<string>(DEFAULT_TOPIC_TAGS);
    allProblems.forEach((problem) => {
      problem.topics.forEach((topic) => topics.add(topic));
    });

    return Array.from(topics).sort((left, right) => {
      const leftIndex = DEFAULT_TOPIC_TAGS.indexOf(left);
      const rightIndex = DEFAULT_TOPIC_TAGS.indexOf(right);

      if (leftIndex !== -1 || rightIndex !== -1) {
        if (leftIndex === -1) return 1;
        if (rightIndex === -1) return -1;
        return leftIndex - rightIndex;
      }

      return left.localeCompare(right);
    });
  }, [allProblems]);

  const companyOptions = useMemo(() => {
    const companies = new Set<string>();
    allProblems.forEach((problem) => {
      problem.companies.forEach((company) => companies.add(company));
    });
    return Array.from(companies).sort((left, right) => left.localeCompare(right));
  }, [allProblems]);

  const trendingSidebarCompanies = useMemo(() => {
    const frequencyMap = new Map<string, number>();
    allProblems.forEach((problem) => {
      problem.companies.forEach((company) => {
        frequencyMap.set(company, (frequencyMap.get(company) || 0) + 1);
      });
    });

    return Array.from(frequencyMap.entries())
      .map(([name, mentions]) => ({ name, mentions }))
      .sort((left, right) => {
        if (right.mentions !== left.mentions) return right.mentions - left.mentions;
        return left.name.localeCompare(right.name);
      })
      .slice(0, 5);
  }, [allProblems]);

  const filteredProblems = useMemo(() => {
    const searchTerms = debouncedSearch
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const filtered = allProblems.filter((problem) => {
      if (category !== "All Topics" && problem.category !== category) {
        return false;
      }

      if (filters.difficulty.length > 0 && !filters.difficulty.includes(problem.difficulty)) {
        return false;
      }

      if (filters.status === "Solved" && !problem.solved) {
        return false;
      }

      if (filters.status === "Unsolved" && problem.solved) {
        return false;
      }

      if (filters.topics.length > 0) {
        const matchesTopic = filters.topics.some((topic) => problem.topics.includes(topic));
        if (!matchesTopic) {
          return false;
        }
      }

      if (filters.company.length > 0) {
        const matchesCompany = filters.company.some((company) => problem.companies.includes(company));
        if (!matchesCompany) {
          return false;
        }
      }

      if (filters.showFavorites && !problem.favorite) {
        return false;
      }

      if (searchTerms.length > 0) {
        const searchableText = [
          problem.title,
          problem.topics.join(" "),
          problem.keywords.join(" "),
          problem.companies.join(" "),
        ]
          .join(" ")
          .toLowerCase();

        const includesSearch = searchTerms.every((term) => searchableText.includes(term));
        if (!includesSearch) {
          return false;
        }
      }

      return true;
    });

    return filtered.sort((left, right) => {
      if (sortBy === "acceptance") {
        return right.acceptance - left.acceptance;
      }

      if (sortBy === "difficulty") {
        return getDifficultyRank(left.difficulty) - getDifficultyRank(right.difficulty);
      }

      if (sortBy === "title") {
        return left.title.localeCompare(right.title);
      }

      return left.problemId - right.problemId;
    });
  }, [allProblems, category, debouncedSearch, filters, sortBy]);

  const solvedCount = useMemo(
    () => allProblems.reduce((count, problem) => count + (problem.solved ? 1 : 0), 0),
    [allProblems]
  );

  const totalCount = allProblems.length;
  const progressPercent = Math.round((solvedCount / Math.max(totalCount, 1)) * 100);

  const progressRadius = 36;
  const circumference = 2 * Math.PI * progressRadius;
  const progressOffset = circumference - (progressPercent / 100) * circumference;

  const handleToggleDifficulty = useCallback((difficulty: Difficulty) => {
    setFilters((previous) => ({
      ...previous,
      difficulty: toggleInArray(previous.difficulty, difficulty),
    }));
  }, []);

  const handleToggleTopic = useCallback((topic: string) => {
    setFilters((previous) => ({
      ...previous,
      topics: toggleInArray(previous.topics, topic),
    }));
  }, []);

  const handleToggleCompany = useCallback((company: string) => {
    setFilters((previous) => ({
      ...previous,
      company: toggleInArray(previous.company, company),
    }));
  }, []);

  const handleStatusChange = useCallback((status: ProblemStatus | null) => {
    setFilters((previous) => ({
      ...previous,
      status,
    }));
  }, []);

  const handleToggleFavoritesFilter = useCallback(() => {
    setFilters((previous) => ({
      ...previous,
      showFavorites: !previous.showFavorites,
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchInput("");
    setCategory("All Topics");
    setFilters({
      difficulty: [],
      topics: [],
      status: null,
      company: [],
      showFavorites: false,
    });
  }, []);

  const handleToggleFavorite = useCallback((problemId: string) => {
    setFavoriteIds((previous) => toggleInArray(previous, problemId));
    // Persist to server
    userApi.toggleFavorite(problemId).catch(() => {});
  }, []);

  const handleToggleSolved = useCallback(
    (problemId: string) => {
      setSolvedOverrides((previous) => {
        const hasOverride = Object.prototype.hasOwnProperty.call(previous, problemId);
        const currentValue = hasOverride ? previous[problemId] : serverSolvedSet.has(problemId);

        return {
          ...previous,
          [problemId]: !currentValue,
        };
      });
    },
    [serverSolvedSet]
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.2),transparent_45%),radial-gradient(circle_at_top_left,rgba(45,212,191,0.12),transparent_40%),var(--bg-primary)]">
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-white/10 bg-gradient-to-r from-cyan-600/20 via-slate-900/60 to-emerald-500/15 p-5 shadow-[0_28px_65px_-40px_rgba(6,182,212,0.95)] backdrop-blur-xl"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">AlgoForge Practice Arena</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">Problems Explorer</h1>
              <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">
                Browse, search, and track coding challenges with a LeetCode-style workflow tuned for speed.
              </p>
            </div>

            <div className="flex items-center gap-4 self-start rounded-2xl border border-white/10 bg-[#0b1526]/80 px-4 py-3">
              <div className="relative h-20 w-20">
                <svg className="h-20 w-20 -rotate-90" viewBox="0 0 100 100" aria-hidden>
                  <circle cx="50" cy="50" r={progressRadius} stroke="rgba(148,163,184,0.2)" strokeWidth="8" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r={progressRadius}
                    stroke="rgb(34 211 238)"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={progressOffset}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
                  {progressPercent}%
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Progress</p>
                <p className="text-xl font-semibold text-emerald-200">
                  {solvedCount} / {totalCount}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">Solved problems</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-6 flex flex-wrap gap-2">
          {CATEGORY_TABS.map((tab) => {
            const active = category === tab;
            const Icon = getStatusIcon(tab);

            return (
              <button
                type="button"
                key={tab}
                onClick={() => setCategory(tab)}
                className={
                  active
                    ? "inline-flex items-center gap-2 rounded-full border border-cyan-300/60 bg-cyan-400/20 px-3 py-1.5 text-sm text-cyan-100"
                    : "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-[var(--text-secondary)] transition hover:border-white/25 hover:text-[var(--text-primary)]"
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {tab}
              </button>
            );
          })}
        </div>

        {problemsQuery.isError && (
          <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Live problem API is unavailable. Problem list and company trends may be incomplete.</span>
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <FilterBar
              searchValue={searchInput}
              onSearchChange={setSearchInput}
              filters={filters}
              sortBy={sortBy}
              companyOptions={companyOptions}
              totalCount={totalCount}
              resultCount={filteredProblems.length}
              onSortChange={setSortBy}
              onToggleDifficulty={handleToggleDifficulty}
              onStatusChange={handleStatusChange}
              onToggleCompany={handleToggleCompany}
              onToggleFavorites={handleToggleFavoritesFilter}
              onClearAll={handleClearFilters}
            />

            <TagBar
              topics={topicOptions}
              activeTopics={filters.topics}
              onToggleTopic={handleToggleTopic}
            />

            {showLoading && <ProblemListSkeleton />}

            {!showLoading && filteredProblems.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center backdrop-blur-xl">
                <div className="mx-auto mb-3 inline-flex rounded-full border border-white/10 bg-[var(--bg-secondary)]/80 p-3">
                  <Sparkles className="h-5 w-5 text-cyan-200" />
                </div>
                <h3 className="text-lg font-semibold">No problems match your filters</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  Try clearing filters or broadening your search terms.
                </p>
              </div>
            )}

            {!showLoading && filteredProblems.length > 0 && (
              <ProblemTable
                problems={filteredProblems}
                onToggleSolved={handleToggleSolved}
                onToggleFavorite={handleToggleFavorite}
              />
            )}

            {!showLoading && problemsQuery.isError && totalCount === 0 && (
              <ErrorState message="Failed to load problem catalog" />
            )}
          </div>

          <div className="h-fit xl:sticky xl:top-24">
            <CompanySidebar
              companies={trendingSidebarCompanies}
              activeCompanies={filters.company}
              onToggleCompany={handleToggleCompany}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
