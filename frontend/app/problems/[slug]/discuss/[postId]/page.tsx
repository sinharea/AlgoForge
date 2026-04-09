"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Flag, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { useParams } from "next/navigation";
import { communityApi } from "@/src/api/communityApi";
import CommentBox from "@/src/components/discuss/CommentBox";
import CommentThread from "@/src/components/discuss/CommentThread";
import VoteButtons from "@/src/components/discuss/VoteButtons";
import ErrorState from "@/src/components/ui/ErrorState";
import { CardSkeleton } from "@/src/components/ui/Skeleton";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";

export default function PostDetailPage() {
  const { ready } = useProtectedRoute();
  const params = useParams<{ slug: string; postId: string }>();
  const slug = params.slug;
  const postId = params.postId;

  const queryClient = useQueryClient();
  const [voteLoadingId, setVoteLoadingId] = useState<string | null>(null);

  const postQuery = useQuery({
    queryKey: ["community-post", postId],
    queryFn: async () => (await communityApi.getPost(postId, { commentsLimit: 300 })).data,
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
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to discuss
      </Link>

      <article className="card mb-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{post.title}</h1>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {post.author?.name || "Unknown"} · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </p>
          </div>

          <VoteButtons
            score={post.score}
            upvotes={post.upvotes}
            downvotes={post.downvotes}
            isLoading={voteLoadingId === post._id}
            onVote={(voteType) => voteMutation.mutate({ targetId: post._id, targetType: "post", voteType })}
          />
        </div>

        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-secondary)]">{post.content}</p>

        <div className="flex flex-wrap items-center gap-2">
          {post.tags?.map((tag) => (
            <span key={tag} className="rounded-full bg-[var(--bg-tertiary)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
              #{tag}
            </span>
          ))}

          <button
            type="button"
            className="ml-auto inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-rose-300"
            onClick={() => reportMutation.mutate(post._id)}
          >
            <Flag className="h-3.5 w-3.5" />
            Report
          </button>
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
          <span className="text-sm text-[var(--text-secondary)]">
            {loadedComments}/{totalComments} loaded
          </span>
        </div>

        <CommentThread
          comments={comments}
          voteLoadingId={voteLoadingId}
          onReply={async (parentId, content) => {
            await createCommentMutation.mutateAsync({ content, parentId });
          }}
          onVote={(targetId, voteType) =>
            voteMutation.mutate({ targetId, targetType: "comment", voteType })
          }
          onReport={(targetId) => reportMutation.mutate(targetId)}
        />
      </section>

      {(voteMutation.isPending || reportMutation.isPending) && (
        <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating discussion...
        </div>
      )}
    </div>
  );
}
