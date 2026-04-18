"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, UserRound, Flag, Eye, Pin, TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import { CommunityPost } from "@/src/api/communityApi";
import VoteButtons from "./VoteButtons";

type PostCardProps = {
  post: CommunityPost;
  problemSlug: string;
  voteLoading?: boolean;
  onVote?: (targetId: string, voteType: 1 | -1) => void;
  onReport?: (targetId: string) => void;
};

export default function PostCard({ post, problemSlug, voteLoading, onVote, onReport }: PostCardProps) {
  return (
    <article className={clsx(
      "group rounded-xl border backdrop-blur-sm transition-all duration-200",
      post.isPinned
        ? "border-amber-500/30 bg-amber-500/[0.04] hover:border-amber-500/50"
        : "border-[var(--border-color)] bg-[var(--bg-secondary)]/80 hover:border-[var(--accent-primary)]/30 hover:shadow-[0_4px_20px_-8px_rgba(139,92,246,0.15)]"
    )}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              {post.isPinned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                  <Pin className="h-2.5 w-2.5" />
                  Pinned
                </span>
              )}
              {post.acceptedCommentId && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  ✓ Answered
                </span>
              )}
            </div>

            <Link
              href={`/problems/${problemSlug}/discuss/${post._id}`}
              className="text-lg font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--accent-secondary)] leading-snug"
            >
              {post.title}
            </Link>

            <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm text-[var(--text-secondary)] leading-relaxed">
              {post.content}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-500/30">
                  <UserRound className="h-3 w-3" />
                </div>
                {post.author?.name || "Unknown"}
                {post.author?.reputation ? (
                  <span className="text-[10px] text-[var(--text-muted)]">({post.author.reputation})</span>
                ) : null}
              </span>
              <span className="text-[var(--text-muted)]">·</span>
              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
              </span>
              {post.viewCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {post.viewCount}
                </span>
              )}
              {onReport && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[var(--text-muted)] transition hover:text-rose-300"
                  onClick={() => onReport(post._id)}
                >
                  <Flag className="h-3 w-3" />
                  Report
                </button>
              )}
            </div>

            {post.tags?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {post.tags.map((tag) => (
                  <span key={tag} className="rounded-md border border-white/8 bg-[var(--bg-tertiary)]/80 px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)]/30 hover:text-[var(--accent-secondary)]">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <VoteButtons
            score={post.score}
            upvotes={post.upvotes}
            downvotes={post.downvotes}
            isLoading={voteLoading}
            onVote={onVote ? (voteType) => onVote(post._id, voteType) : undefined}
          />
        </div>
      </div>
    </article>
  );
}
