"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { clsx } from "clsx";

type VoteButtonsProps = {
  score: number;
  upvotes?: number;
  downvotes?: number;
  compact?: boolean;
  isLoading?: boolean;
  onVote?: (voteType: 1 | -1) => void;
};

export default function VoteButtons({
  score,
  upvotes,
  downvotes,
  compact = false,
  isLoading = false,
  onVote,
}: VoteButtonsProps) {
  return (
    <div className={clsx("flex items-center gap-1.5", compact ? "text-xs" : "text-sm")}>
      <button
        type="button"
        className={clsx(
          "rounded-md border border-[var(--border-color)] text-[var(--text-secondary)] transition-colors",
          compact ? "p-1" : "p-1.5",
          onVote && "hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-300"
        )}
        onClick={() => onVote?.(1)}
        disabled={!onVote || isLoading}
        aria-label="Upvote"
      >
        <ChevronUp className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>

      <span className="min-w-10 text-center font-semibold text-[var(--text-primary)]">{score}</span>

      <button
        type="button"
        className={clsx(
          "rounded-md border border-[var(--border-color)] text-[var(--text-secondary)] transition-colors",
          compact ? "p-1" : "p-1.5",
          onVote && "hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300"
        )}
        onClick={() => onVote?.(-1)}
        disabled={!onVote || isLoading}
        aria-label="Downvote"
      >
        <ChevronDown className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </button>

      {(upvotes !== undefined || downvotes !== undefined) && !compact && (
        <span className="ml-1 text-xs text-[var(--text-muted)]">
          {upvotes ?? 0} up / {downvotes ?? 0} down
        </span>
      )}
    </div>
  );
}
