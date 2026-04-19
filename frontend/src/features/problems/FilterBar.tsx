"use client";

import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { ListFilter, Search, Star, X } from "lucide-react";
import { Difficulty, ProblemFiltersState, ProblemSort, ProblemStatus } from "./types";

type Props = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters: ProblemFiltersState;
  sortBy: ProblemSort;
  companyOptions: string[];
  totalCount: number;
  resultCount: number;
  onSortChange: (value: ProblemSort) => void;
  onToggleDifficulty: (difficulty: Difficulty) => void;
  onStatusChange: (status: ProblemStatus | null) => void;
  onToggleCompany: (company: string) => void;
  onToggleFavorites: () => void;
  onClearAll: () => void;
};

const sortOptions: Array<{ value: ProblemSort; label: string }> = [
  { value: "acceptance", label: "Acceptance rate" },
  { value: "difficulty", label: "Difficulty" },
  { value: "id", label: "Problem ID" },
  { value: "title", label: "Title" },
];

const difficultyOptions: Difficulty[] = ["Easy", "Medium", "Hard"];

export default function FilterBar({
  searchValue,
  onSearchChange,
  filters,
  sortBy,
  companyOptions,
  totalCount,
  resultCount,
  onSortChange,
  onToggleDifficulty,
  onStatusChange,
  onToggleCompany,
  onToggleFavorites,
  onClearAll,
}: Props) {
  const hasActiveFilters =
    filters.difficulty.length > 0 ||
    filters.topics.length > 0 ||
    filters.company.length > 0 ||
    filters.status !== null ||
    filters.showFavorites;

  return (
    <motion.section
      layout
      className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4 shadow-[0_22px_50px_-35px_rgba(92,67,31,0.72)]"
    >
      <div className="grid gap-3 md:grid-cols-[1.5fr_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by problem title or keywords"
            className="input !pl-10"
          />
        </div>

        <select
          value={sortBy}
          onChange={(event) => onSortChange(event.target.value as ProblemSort)}
          className="input select"
          aria-label="Sort problems"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              Sort: {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onToggleFavorites}
          className={clsx(
            "inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition",
            filters.showFavorites
              ? "border-[#b89457]/60 bg-[#f0e0c4] text-[#7a5b2b]"
              : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
          )}
        >
          <Star className={clsx("h-4 w-4", filters.showFavorites && "fill-current")} />
          Show Favorites
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Difficulty</p>
          <div className="flex flex-wrap gap-2">
            {difficultyOptions.map((difficulty) => {
              const active = filters.difficulty.includes(difficulty);
              return (
                <button
                  type="button"
                  key={difficulty}
                  onClick={() => onToggleDifficulty(difficulty)}
                  className={clsx(
                    "rounded-full border px-3 py-1.5 text-sm transition",
                    active
                      ? "border-[#b89457]/60 bg-[#f0e0c4] text-[#7d5e2a]"
                      : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {difficulty}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Status</p>
          <div className="flex flex-wrap gap-2">
            {[null, "Solved", "Unsolved"].map((status) => {
              const label = status || "Any";
              const active = filters.status === status;
              return (
                <button
                  type="button"
                  key={label}
                  onClick={() => onStatusChange(status as ProblemStatus | null)}
                  className={clsx(
                    "rounded-full border px-3 py-1.5 text-sm transition",
                    active
                      ? "border-[#9db59a] bg-[#e5efdd] text-[#446043]"
                      : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Companies</p>
          <div className="flex max-h-[84px] flex-wrap gap-2 overflow-y-auto pr-1">
            {companyOptions.slice(0, 18).map((company) => {
              const active = filters.company.includes(company);
              return (
                <button
                  type="button"
                  key={company}
                  onClick={() => onToggleCompany(company)}
                  className={clsx(
                    "rounded-full border px-2.5 py-1 text-xs transition",
                    active
                      ? "border-[#b89457]/60 bg-[#f1e4cb] text-[#7a5b2b]"
                      : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {company}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-color)] pt-3">
        <div className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <ListFilter className="h-4 w-4" />
          <span>
            Showing {resultCount} of {totalCount} problems
          </span>
        </div>

        <AnimatePresence initial={false}>
          {hasActiveFilters && (
            <motion.button
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition hover:border-[#cf9a9a] hover:text-[#884545]"
            >
              <X className="h-3.5 w-3.5" />
              Reset Filters
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
