"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MessageSquarePlus } from "lucide-react";
import toast from "react-hot-toast";
import { problemApi } from "@/src/api/problemApi";
import { communityApi, CommunitySort } from "@/src/api/communityApi";
import PostCard from "@/src/components/discuss/PostCard";
import ErrorState from "@/src/components/ui/ErrorState";
import { CardSkeleton } from "@/src/components/ui/Skeleton";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";
import { useParams } from "next/navigation";

const objectIdRegex = /^[a-fA-F0-9]{24}$/;

const getProblemByRouteParam = async (slug: string) => {
  if (objectIdRegex.test(slug)) {
    try {
      return (await problemApi.getById(slug)).data;
    } catch {
      return (await problemApi.getBySlug(slug)).data;
    }
  }
  return (await problemApi.getBySlug(slug)).data;
};

export default function ProblemDiscussPage() {
  const { ready } = useProtectedRoute();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const queryClient = useQueryClient();
  const [sort, setSort] = useState<CommunitySort>("newest");
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [voteLoadingId, setVoteLoadingId] = useState<string | null>(null);

  const problemQuery = useQuery({
    queryKey: ["problem-discuss", slug],
    queryFn: () => getProblemByRouteParam(slug),
    enabled: Boolean(slug),
  });

  const problemId = problemQuery.data?._id as string | undefined;

  const postsQuery = useInfiniteQuery({
    queryKey: ["community-posts", problemId, sort],
    enabled: Boolean(problemId),
    initialPageParam: 1,
    queryFn: async ({ pageParam }) =>
      (
        await communityApi.listPosts({
          problemId: problemId!,
          page: Number(pageParam),
          limit: 10,
          sort,
        })
      ).data,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });

  const createPostMutation = useMutation({
    mutationFn: async () => {
      const normalizedTags = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      return (
        await communityApi.createPost({
          problemId: problemId!,
          title: title.trim(),
          content: content.trim(),
          tags: normalizedTags,
        })
      ).data;
    },
    onSuccess: () => {
      toast.success("Post created successfully");
      setTitle("");
      setContent("");
      setTags("");
      setShowComposer(false);
      queryClient.invalidateQueries({ queryKey: ["community-posts", problemId] });
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || "Failed to create post";
      toast.error(message);
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({ targetId, voteType }: { targetId: string; voteType: 1 | -1 }) =>
      communityApi.vote({ targetType: "post", targetId, voteType }),
    onMutate: ({ targetId }) => {
      setVoteLoadingId(targetId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts", problemId] });
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

  const posts = useMemo(
    () => postsQuery.data?.pages.flatMap((page) => page.items) || [],
    [postsQuery.data]
  );

  if (!ready || problemQuery.isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8 sm:px-6">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (problemQuery.isError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <ErrorState message="Failed to load problem discussion" onRetry={() => problemQuery.refetch()} />
      </div>
    );
  }

  const handleCreatePost = async () => {
    if (!problemId) return;
    if (!title.trim() || !content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    await createPostMutation.mutateAsync();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href={`/problems/${slug}`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to problem
          </Link>
          <h1 className="text-3xl font-bold">Discuss</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{problemQuery.data?.title}</p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowComposer((value) => !value)}>
          <MessageSquarePlus className="h-4 w-4" />
          {showComposer ? "Close" : "Create post"}
        </button>
      </div>

      {showComposer && (
        <div className="card mb-6 space-y-3">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Post title"
            className="input"
          />
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Share your solution idea, optimization, or question..."
            rows={6}
            className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
          />
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            placeholder="Tags (comma separated): dp, graphs, binary-search"
            className="input"
          />
          <div className="flex justify-end">
            <button
              className="btn btn-primary"
              onClick={handleCreatePost}
              disabled={createPostMutation.isPending}
            >
              {createPostMutation.isPending ? "Posting..." : "Publish post"}
            </button>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm text-[var(--text-secondary)]">{posts.length} posts loaded</p>
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value as CommunitySort)}
          className="input select max-w-[200px]"
        >
          <option value="newest">Newest</option>
          <option value="most_votes">Most votes</option>
        </select>
      </div>

      {postsQuery.isError && (
        <ErrorState message="Failed to load posts" onRetry={() => postsQuery.refetch()} />
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            problemSlug={slug}
            voteLoading={voteLoadingId === post._id}
            onVote={(targetId, voteType) => voteMutation.mutate({ targetId, voteType })}
            onReport={(targetId) => reportMutation.mutate(targetId)}
          />
        ))}
      </div>

      {postsQuery.isPending && (
        <div className="mt-6 flex items-center justify-center text-[var(--text-secondary)]">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      {!postsQuery.isPending && posts.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-[var(--border-color)] p-8 text-center text-[var(--text-secondary)]">
          No posts yet. Start the first discussion for this problem.
        </div>
      )}

      {postsQuery.hasNextPage && (
        <div className="mt-6 flex justify-center">
          <button
            className="btn btn-secondary"
            onClick={() => postsQuery.fetchNextPage()}
            disabled={postsQuery.isFetchingNextPage}
          >
            {postsQuery.isFetchingNextPage ? "Loading more..." : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
