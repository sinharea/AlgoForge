"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Flag, Loader2, Eye, MessageSquare, Pin, CheckCircle2, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { clsx } from "clsx";
import toast from "react-hot-toast";
import { useParams } from "next/navigation";
import { communityApi } from "@/src/api/communityApi";
import CommentBox from "@/src/components/discuss/CommentBox";
import CommentThread from "@/src/components/discuss/CommentThread";
import VoteButtons from "@/src/components/discuss/VoteButtons";
import ErrorState from "@/src/components/ui/ErrorState";
import { CardSkeleton } from "@/src/components/ui/Skeleton";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";
import { getUser } from "@/src/utils/auth";

export default function PostDetailPage() {
  const { ready } = useProtectedRoute();
  const params = useParams<{ slug: string; postId: string }>();
  const slug = params.slug;
  const postId = params.postId;

  const queryClient = useQueryClient();
  const [voteLoadingId, setVoteLoadingId] = useState<string | null>(null);
  const [commentSort, setCommentSort] = useState<"oldest" | "newest" | "top">("oldest");

  const currentUser = getUser();
  const currentUserId = currentUser?._id || currentUser?.id || null;

  const postQuery = useQuery({
    queryKey: ["community-post", postId, commentSort],
    queryFn: async () => (await communityApi.getPost(postId, { commentsLimit: 300, commentSort })).data,
    enabled: Boolean(postId),
  });

  const createCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) =>
      communityApi.createComment({ postId, content, parentId: parentId || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-post", postId] });
      queryClient.invalidateQueries({ queryKey: ["community-posts", postQuery.data?.post.problemId] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || "Failed to add comment";
      toast.error(message);
    },
  });

  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) =>
      communityApi.editComment(commentId, { content }),
    onSuccess: () => {
      toast.success("Comment updated");
      queryClient.invalidateQueries({ queryKey: ["community-post", postId] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || "Failed to edit comment");
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => communityApi.deleteComment(commentId),
    onSuccess: () => {
      toast.success("Comment deleted");
      queryClient.invalidateQueries({ queryKey: ["community-post", postId] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || "Failed to delete comment");
    },
  });

  const pinCommentMutation = useMutation({
    mutationFn: async (commentId: string) => communityApi.pinComment(postId, commentId),
    onSuccess: (data: any) => {
      toast.success(data.data?.pinned ? "Comment pinned" : "Comment unpinned");
      queryClient.invalidateQueries({ queryKey: ["community-post", postId] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || "Failed to pin comment");
    },
  });

  const acceptCommentMutation = useMutation({
    mutationFn: async (commentId: string) => communityApi.acceptComment(postId, commentId),
    onSuccess: (data: any) => {
      toast.success(data.data?.accepted ? "Answer accepted" : "Answer unaccepted");
      queryClient.invalidateQueries({ queryKey: ["community-post", postId] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error?.message || "Failed to accept answer");
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ targetId, targetType, voteType }: { targetId: string; targetType: "post" | "comment"; voteType: 1 | -1 }) =>
      communityApi.vote({ targetType, targetId, voteType }),
    onMutate: ({ targetId }) => {
      setVoteLoadingId(targetId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-post", postId] });
      queryClient.invalidateQueries({ queryKey: ["community-posts", postQuery.data?.post.problemId] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || "Unable to vote";
      toast.error(message);
    },
    onSettled: () => {
      setVoteLoadingId(null);
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (targetId: string) => {
      const reason = window.prompt("Reason for report:");
      if (!reason || !reason.trim()) return;
      await communityApi.report({ targetId, reason: reason.trim() });
    },
    onSuccess: () => {
      toast.success("Report submitted");
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || "Failed to report";
      toast.error(message);
    },
  });

  if (!ready || postQuery.isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8 sm:px-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (postQuery.isError || !postQuery.data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <ErrorState message="Failed to load post" onRetry={() => postQuery.refetch()} />
      </div>
    );
  }

  const { post, comments, loadedComments, totalComments } = postQuery.data;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href={`/problems/${slug}/discuss`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to discussions
      </Link>

      <article className="mb-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 backdrop-blur">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2">
                {post.isPinned && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    <Pin className="h-2.5 w-2.5" /> Pinned
                  </span>
                )}
                {post.acceptedCommentId && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Has Accepted Answer
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{post.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                <span className="font-medium text-[var(--text-secondary)]">{post.author?.name || "Unknown"}</span>
                <span>·</span>
                <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                {post.viewCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {post.viewCount} views
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> {totalComments} comments
                </span>
              </div>
            </div>

            <VoteButtons
              score={post.score}
              upvotes={post.upvotes}
              downvotes={post.downvotes}
              isLoading={voteLoadingId === post._id}
              onVote={(voteType) => voteMutation.mutate({ targetId: post._id, targetType: "post", voteType })}
            />
          </div>

          <div className="mt-4 rounded-lg bg-[var(--bg-primary)]/50 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">{post.content}</p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {post.tags?.map((tag) => (
              <span key={tag} className="rounded-md border border-white/8 bg-[var(--bg-tertiary)]/80 px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                #{tag}
              </span>
            ))}

            <button
              type="button"
              className="ml-auto inline-flex items-center gap-1 text-xs text-[var(--text-muted)] transition hover:text-rose-300"
              onClick={() => reportMutation.mutate(post._id)}
            >
              <Flag className="h-3 w-3" />
              Report
            </button>
          </div>
        </div>
      </article>

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Add a comment</h2>
        <CommentBox
          submitLabel="Comment"
          isSubmitting={createCommentMutation.isPending}
          onSubmit={async (value) => {
            await createCommentMutation.mutateAsync({ content: value });
          }}
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Comments</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-muted)]">
              {loadedComments}/{totalComments}
            </span>
            <div className="flex rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)]">
              {(["oldest", "newest", "top"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setCommentSort(s)}
                  className={clsx(
                    "px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                    commentSort === s
                      ? "bg-[var(--accent-primary)]/15 text-[var(--accent-secondary)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <CommentThread
          comments={comments}
          voteLoadingId={voteLoadingId}
          currentUserId={currentUserId}
          postAuthorId={post.userId}
          onReply={async (parentId, content) => {
            await createCommentMutation.mutateAsync({ content, parentId });
          }}
          onVote={(targetId, voteType) =>
            voteMutation.mutate({ targetId, targetType: "comment", voteType })
          }
          onEdit={async (commentId, content) => {
            await editCommentMutation.mutateAsync({ commentId, content });
          }}
          onDelete={(commentId) => {
            if (window.confirm("Delete this comment? This action cannot be undone.")) {
              deleteCommentMutation.mutate(commentId);
            }
          }}
          onPin={(commentId) => pinCommentMutation.mutate(commentId)}
          onAccept={(commentId) => acceptCommentMutation.mutate(commentId)}
          onReport={(targetId) => reportMutation.mutate(targetId)}
        />
      </section>
    </div>
  );
}
