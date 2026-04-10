import Link from "next/link";

type RecommendedProblemCardProps = {
  title: string;
  slug: string;
  difficulty: string;
  tags?: string[];
};

const difficultyClassMap: Record<string, string> = {
  Easy: "text-emerald-300 bg-emerald-500/15",
  Medium: "text-amber-300 bg-amber-500/15",
  Hard: "text-rose-300 bg-rose-500/15",
};

export default function RecommendedProblemCard({
  title,
  slug,
  difficulty,
  tags = [],
}: RecommendedProblemCardProps) {
  const difficultyClass = difficultyClassMap[difficulty] || "text-slate-300 bg-slate-500/15";

  return (
    <article className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${difficultyClass}`}>
          {difficulty}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
          >
            {tag}
          </span>
        ))}
      </div>

      <Link href={`/problems/${slug}`} className="mt-4 inline-flex text-sm font-medium text-[var(--accent-secondary)] hover:underline">
        Solve problem
      </Link>
    </article>
  );
}
