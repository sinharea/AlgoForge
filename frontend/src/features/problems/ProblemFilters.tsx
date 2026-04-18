"use client";

type Props = {
  difficulty: string;
  tags: string;
  search: string;
  onChange: (next: { difficulty: string; tags: string; search: string }) => void;
};

export default function ProblemFilters({ difficulty, tags, search, onChange }: Props) {
  return (
    <div className="grid gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4 md:grid-cols-3">
      <input
        value={search}
        onChange={(e) => onChange({ difficulty, tags, search: e.target.value })}
        placeholder="Search problems"
        className="input"
      />
      <select
        value={difficulty}
        onChange={(e) => onChange({ difficulty: e.target.value, tags, search })}
        className="input select"
      >
        <option value="">All Difficulty</option>
        <option value="Easy">Easy</option>
        <option value="Medium">Medium</option>
        <option value="Hard">Hard</option>
      </select>
      <input
        value={tags}
        onChange={(e) => onChange({ difficulty, tags: e.target.value, search })}
        placeholder="Tags (comma separated)"
        className="input"
      />
    </div>
  );
}
