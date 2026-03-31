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
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[var(--bg-primary)]/70 shadow-[0_24px_60px_-42px_rgba(56,189,248,.9)]">
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full min-w-[760px] border-collapse">
          <thead className="sticky top-0 z-10 bg-[#111723]/95 backdrop-blur-xl">
            <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              <th className="px-3 py-3 text-center">Fav</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Problem ID</th>
              <th className="px-3 py-3">Title</th>
              <th className="px-3 py-3">Acceptance</th>
              <th className="px-3 py-3">Difficulty</th>
              <th className="px-3 py-3 text-center">Lock</th>
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
    </div>
  );
}
