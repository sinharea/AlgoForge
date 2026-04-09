import api from "./client";

export type CommunitySort = "newest" | "most_votes";

export type CommunityAuthor = {
  _id: string;
  name: string;
  reputation: number;
};

export type CommunityPost = {
  _id: string;
  problemId: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  downvotes: number;
  score: number;
  commentCount: number;
  author: CommunityAuthor | null;
};

export type CommunityComment = {
  _id: string;
  postId: string;
  userId: string;
  parentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  downvotes: number;
  score: number;
  author: CommunityAuthor | null;
  replies: CommunityComment[];
};

export type ListPostsResponse = {
  items: CommunityPost[];
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasMore: boolean;
  sort: CommunitySort;
};

export type PostDetailResponse = {
  post: CommunityPost;
  comments: CommunityComment[];
  totalComments: number;
  loadedComments: number;
};

export const communityApi = {
  createPost: (payload: { problemId: string; title: string; content: string; tags?: string[] }) =>
    api.post<CommunityPost>("/posts", payload),

  listPosts: (params: { problemId: string; page?: number; limit?: number; sort?: CommunitySort }) =>
    api.get<ListPostsResponse>("/posts", { params }),

  getPost: (id: string, params?: { commentsLimit?: number }) =>
    api.get<PostDetailResponse>(`/posts/${id}`, { params }),

  createComment: (payload: { postId: string; parentId?: string | null; content: string }) =>
    api.post("/comments", payload),

  vote: (payload: { targetType: "post" | "comment"; targetId: string; voteType: 1 | -1 }) =>
    api.post("/vote", payload),

  report: (payload: { targetId: string; reason: string }) => api.post("/report", payload),
};
