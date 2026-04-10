type WeakTopicCardProps = {
  topic: string;
  accuracy: number;
  attempts: number;
  type?: "weak" | "strong";
};

const toPercent = (value: number) => Number((value * 100).toFixed(1));

export default function WeakTopicCard({ topic, accuracy, attempts, type = "weak" }: WeakTopicCardProps) {
  const accuracyPercent = toPercent(accuracy || 0);
  const isStrong = type === "strong";

  return (
    <article
      className={[
        "rounded-xl border p-4 transition-colors",
        isStrong
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-amber-500/30 bg-amber-500/5",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{topic}</h3>
        <span
          className={[
            "rounded-full px-2 py-0.5 text-xs font-semibold",
            isStrong ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300",
          ].join(" ")}
        >
          {accuracyPercent}%
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>Attempts: {attempts}</span>
        <span>{isStrong ? "Strong area" : "Needs work"}</span>
      </div>

      <div className="mt-3 h-2 rounded-full bg-[var(--bg-tertiary)]">
        <div
          className={[
            "h-2 rounded-full",
            isStrong ? "bg-emerald-400" : "bg-amber-400",
          ].join(" ")}
          style={{ width: `${Math.min(100, Math.max(0, accuracyPercent))}%` }}
        />
      </div>
    </article>
  );
}
