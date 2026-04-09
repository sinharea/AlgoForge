"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, UserRound, Flag } from "lucide-react";
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
    <article className="card card-hover animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Link
            href={`/problems/${problemSlug}/discuss/${post._id}`}
            className="text-lg font-semibold text-[var(--text-primary)] hover:text-[var(--accent-secondary)]"
          >
            {post.title}
          </Link>
          <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
            {post.content}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1">
              <UserRound className="h-3.5 w-3.5" />
              {post.author?.name || "Unknown"}
            </span>
            <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              {post.commentCount}
            </span>
            {onReport && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[var(--text-muted)] hover:text-rose-300"
                onClick={() => onReport(post._id)}
              >
                <Flag className="h-3.5 w-3.5" />
                Report
              </button>
            )}
          </div>

          {post.tags?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
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
    </article>
  );
}
