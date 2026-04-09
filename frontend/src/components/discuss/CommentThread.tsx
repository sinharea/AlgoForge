"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Flag, MessageCircleReply, UserRound } from "lucide-react";
import { CommunityComment } from "@/src/api/communityApi";
import VoteButtons from "./VoteButtons";
import CommentBox from "./CommentBox";

type CommentThreadProps = {
  comments: CommunityComment[];
  voteLoadingId?: string | null;
  onReply: (parentId: string, content: string) => Promise<void> | void;
  onVote: (targetId: string, voteType: 1 | -1) => void;
  onReport?: (targetId: string) => void;
};

type CommentNodeItemProps = {
  comment: CommunityComment;
  depth: number;
  voteLoadingId?: string | null;
  onReply: (parentId: string, content: string) => Promise<void> | void;
  onVote: (targetId: string, voteType: 1 | -1) => void;
  onReport?: (targetId: string) => void;
};

function CommentNodeItem({
  comment,
  depth,
  voteLoadingId,
  onReply,
  onVote,
  onReport,
}: CommentNodeItemProps) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [isReplying, setIsReplying] = useState(false);

  const handleReply = async (content: string) => {
    setIsReplying(true);
    try {
      await onReply(comment._id, content);
      setShowReplyBox(false);
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <div
      className="space-y-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
      style={{ marginLeft: `${Math.min(depth, 5) * 12}px` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
              <UserRound className="h-3.5 w-3.5" />
              {comment.author?.name || "Unknown"}
            </span>
            <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
          </div>

          <p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">{comment.content}</p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              onClick={() => setShowReplyBox((value) => !value)}
            >
              <MessageCircleReply className="h-3.5 w-3.5" />
              Reply
            </button>
            {onReport && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-rose-300"
                onClick={() => onReport(comment._id)}
              >
                <Flag className="h-3.5 w-3.5" />
                Report
              </button>
            )}
          </div>
        </div>

        <VoteButtons
          compact
          score={comment.score}
          upvotes={comment.upvotes}
          downvotes={comment.downvotes}
          isLoading={voteLoadingId === comment._id}
          onVote={(voteType) => onVote(comment._id, voteType)}
        />
      </div>

      {showReplyBox && (
        <CommentBox
          placeholder="Write a reply..."
          submitLabel="Reply"
          isSubmitting={isReplying}
          onSubmit={handleReply}
          onCancel={() => setShowReplyBox(false)}
        />
      )}

      {comment.replies?.length > 0 && (
        <div className="space-y-3">
          {comment.replies.map((reply) => (
            <CommentNodeItem
              key={reply._id}
              comment={reply}
              depth={depth + 1}
              voteLoadingId={voteLoadingId}
              onReply={onReply}
              onVote={onVote}
              onReport={onReport}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentThread({
  comments,
  voteLoadingId,
  onReply,
  onVote,
  onReport,
}: CommentThreadProps) {
  if (!comments.length) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border-color)] p-6 text-center text-sm text-[var(--text-muted)]">
        No comments yet. Start the conversation.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <CommentNodeItem
          key={comment._id}
          comment={comment}
          depth={0}
          voteLoadingId={voteLoadingId}
          onReply={onReply}
          onVote={onVote}
          onReport={onReport}
        />
      ))}
    </div>
  );
}
