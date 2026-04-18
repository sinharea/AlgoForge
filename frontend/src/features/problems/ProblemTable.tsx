"use client";

import { ProblemViewItem } from "./types";
import ProblemRow from "./ProblemRow";

type Props = {
  problems: ProblemViewItem[];
  onToggleSolved: (problemId: string) => void;
  onToggleFavorite: (problemId: string) => void;
};

export default function ProblemTable({ problems, onToggleSolved, onToggleFavorite }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--bg-primary)]/70 shadow-[0_24px_60px_-42px_rgba(56,189,248,.6)] backdrop-blur">
      <div className="max-h-[72vh] overflow-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead className="sticky top-0 z-10 bg-[#0d1424]/95 backdrop-blur-xl">
            <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              <th className="px-3 py-3.5 text-center w-12">Fav</th>
              <th className="px-3 py-3.5 w-14">Status</th>
              <th className="px-3 py-3.5 w-20">#</th>
              <th className="px-3 py-3.5">Title</th>
              <th className="px-3 py-3.5 w-36">Acceptance</th>
              <th className="px-3 py-3.5 w-24">Difficulty</th>
              <th className="px-3 py-3.5 text-center w-16">Discuss</th>
            </tr>
          </thead>

          <tbody>
            {problems.map((problem, index) => (
              <ProblemRow
                key={problem.id}
                problem={problem}
                index={index}
                onToggleSolved={onToggleSolved}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-white/8 bg-[#0d1424]/60 px-4 py-2.5">
        <p className="text-xs text-[var(--text-muted)]">
          Showing {problems.length} problem{problems.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
