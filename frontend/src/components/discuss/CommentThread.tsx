"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Flag, MessageCircleReply, UserRound, Pencil, Trash2, Pin, CheckCircle2, Clock } from "lucide-react";
import { clsx } from "clsx";
import { CommunityComment } from "@/src/api/communityApi";
import VoteButtons from "./VoteButtons";
import CommentBox from "./CommentBox";

const formatRelativeTime = (value?: string) => {
  if (!value) return "just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  return formatDistanceToNow(date, { addSuffix: true });
};

type CommentThreadProps = {
  comments: CommunityComment[];
  voteLoadingId?: string | null;
  currentUserId?: string | null;
  postAuthorId?: string | null;
  onReply: (parentId: string, content: string) => Promise<void> | void;
  onVote: (targetId: string, voteType: 1 | -1) => void;
  onEdit?: (commentId: string, content: string) => Promise<void> | void;
  onDelete?: (commentId: string) => void;
  onPin?: (commentId: string) => void;
  onAccept?: (commentId: string) => void;
  onReport?: (targetId: string) => void;
};

type CommentNodeItemProps = {
  comment: CommunityComment;
  depth: number;
  voteLoadingId?: string | null;
  currentUserId?: string | null;
  postAuthorId?: string | null;
  onReply: (parentId: string, content: string) => Promise<void> | void;
  onVote: (targetId: string, voteType: 1 | -1) => void;
  onEdit?: (commentId: string, content: string) => Promise<void> | void;
  onDelete?: (commentId: string) => void;
  onPin?: (commentId: string) => void;
  onAccept?: (commentId: string) => void;
  onReport?: (targetId: string) => void;
};

function CommentNodeItem({
  comment,
  depth,
  voteLoadingId,
  currentUserId,
  postAuthorId,
  onReply,
  onVote,
  onEdit,
  onDelete,
  onPin,
  onAccept,
  onReport,
}: CommentNodeItemProps) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [collapsed, setCollapsed] = useState(false);

  const isOwnComment = currentUserId && String(comment.userId) === String(currentUserId);
  const isPostAuthor = postAuthorId && String(currentUserId) === String(postAuthorId);

  const handleReply = async (content: string) => {
    setIsReplying(true);
    try {
      await onReply(comment._id, content);
      setShowReplyBox(false);
    } finally {
      setIsReplying(false);
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim() || !onEdit) return;
    await onEdit(comment._id, editContent.trim());
    setIsEditing(false);
  };

  if (comment.isDeleted) {
    return (
      <div
        className="rounded-lg border border-[var(--border-color)]/50 bg-[var(--bg-secondary)]/30 px-4 py-3 text-sm italic text-[var(--text-muted)]"
        style={{ marginLeft: `${Math.min(depth, 5) * 16}px` }}
      >
        [This comment has been deleted]
        {comment.replies?.length > 0 && !collapsed && (
          <div className="mt-3 space-y-3">
            {comment.replies.map((reply) => (
              <CommentNodeItem
                key={reply._id}
                comment={reply}
                depth={depth + 1}
                voteLoadingId={voteLoadingId}
                currentUserId={currentUserId}
                postAuthorId={postAuthorId}
                onReply={onReply}
                onVote={onVote}
                onEdit={onEdit}
                onDelete={onDelete}
                onPin={onPin}
                onAccept={onAccept}
                onReport={onReport}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "rounded-xl border transition-all duration-200",
        comment.isPinned
          ? "border-amber-500/25 bg-amber-500/[0.03]"
          : comment.isAccepted
            ? "border-emerald-500/25 bg-emerald-500/[0.03]"
            : "border-[var(--border-color)] bg-[var(--bg-secondary)]/80"
      )}
      style={{ marginLeft: `${Math.min(depth, 5) * 16}px` }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/25 to-cyan-500/25">
                  <UserRound className="h-3 w-3 text-[var(--text-secondary)]" />
                </div>
                {comment.author?.name || "Unknown"}
              </span>
              {comment.author?.reputation ? (
                <span className="rounded-full bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                  Rep: {comment.author.reputation}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(comment.createdAt)}
              </span>
              {comment.isEdited && (
                <span className="text-[var(--text-muted)] italic">(edited)</span>
              )}
              {comment.isPinned && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                  <Pin className="h-2.5 w-2.5" /> Pinned
                </span>
              )}
              {comment.isAccepted && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Accepted
                </span>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 text-sm text-[var(--text-primary)] focus:border-[var(--accent-primary)] focus:outline-none"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button className="btn btn-primary text-xs" onClick={handleEdit}>Save</button>
                  <button className="btn btn-ghost text-xs" onClick={() => { setIsEditing(false); setEditContent(comment.content); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm text-[var(--text-primary)] leading-relaxed">{comment.content}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                onClick={() => setShowReplyBox((value) => !value)}
              >
                <MessageCircleReply className="h-3 w-3" />
                Reply
                {comment.replyCount > 0 && <span className="text-[var(--text-muted)]">({comment.replyCount})</span>}
              </button>
              {isOwnComment && onEdit && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--text-muted)] transition hover:bg-[var(--bg-tertiary)] hover:text-cyan-300"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              )}
              {isOwnComment && onDelete && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--text-muted)] transition hover:bg-rose-500/10 hover:text-rose-300"
                  onClick={() => onDelete(comment._id)}
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              )}
              {isPostAuthor && onPin && (
                <button
                  type="button"
                  className={clsx(
                    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition hover:bg-amber-500/10",
                    comment.isPinned ? "text-amber-300" : "text-[var(--text-muted)] hover:text-amber-300"
                  )}
                  onClick={() => onPin(comment._id)}
                >
                  <Pin className="h-3 w-3" />
                  {comment.isPinned ? "Unpin" : "Pin"}
                </button>
              )}
              {isPostAuthor && onAccept && (
                <button
                  type="button"
                  className={clsx(
                    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition hover:bg-emerald-500/10",
                    comment.isAccepted ? "text-emerald-300" : "text-[var(--text-muted)] hover:text-emerald-300"
                  )}
                  onClick={() => onAccept(comment._id)}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {comment.isAccepted ? "Unaccept" : "Accept"}
                </button>
              )}
              {onReport && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--text-muted)] transition hover:bg-rose-500/10 hover:text-rose-300"
                  onClick={() => onReport(comment._id)}
                >
                  <Flag className="h-3 w-3" />
                  Report
                </button>
              )}
              {comment.replies?.length > 0 && (
                <button
                  type="button"
                  className="ml-auto text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  onClick={() => setCollapsed(!collapsed)}
                >
                  {collapsed ? `Show ${comment.replies.length} replies` : "Collapse"}
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
      </div>

      {showReplyBox && (
        <div className="border-t border-[var(--border-color)]/50 p-4">
          <CommentBox
            placeholder="Write a reply..."
            submitLabel="Reply"
            isSubmitting={isReplying}
            onSubmit={handleReply}
            onCancel={() => setShowReplyBox(false)}
          />
        </div>
      )}

      {comment.replies?.length > 0 && !collapsed && (
        <div className="space-y-3 px-4 pb-4">
          {comment.replies.map((reply) => (
            <CommentNodeItem
              key={reply._id}
              comment={reply}
              depth={depth + 1}
              voteLoadingId={voteLoadingId}
              currentUserId={currentUserId}
              postAuthorId={postAuthorId}
              onReply={onReply}
              onVote={onVote}
              onEdit={onEdit}
              onDelete={onDelete}
              onPin={onPin}
              onAccept={onAccept}
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
  currentUserId,
  postAuthorId,
  onReply,
  onVote,
  onEdit,
  onDelete,
  onPin,
  onAccept,
  onReport,
}: CommentThreadProps) {
  if (!comments.length) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border-color)] p-8 text-center">
        <MessageCircleReply className="mx-auto mb-2 h-8 w-8 text-[var(--text-muted)]/40" />
        <p className="text-sm text-[var(--text-muted)]">No comments yet. Start the conversation.</p>
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
          currentUserId={currentUserId}
          postAuthorId={postAuthorId}
          onReply={onReply}
          onVote={onVote}
          onEdit={onEdit}
          onDelete={onDelete}
          onPin={onPin}
          onAccept={onAccept}
          onReport={onReport}
        />
      ))}
    </div>
  );
}
