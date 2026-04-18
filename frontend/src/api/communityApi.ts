import api from "./client";

export type CommunitySort = "newest" | "most_votes" | "hot";

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
  viewCount: number;
  isPinned: boolean;
  acceptedCommentId: string | null;
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
  replyCount: number;
  depth: number;
  isEdited: boolean;
  isPinned: boolean;
  isAccepted: boolean;
  isDeleted: boolean;
  mentions: string[];
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

  listPosts: (params: { problemId: string; page?: number; limit?: number; sort?: CommunitySort; search?: string }) =>
    api.get<ListPostsResponse>("/posts", { params }),

  getPost: (id: string, params?: { commentsLimit?: number; commentSort?: string }) =>
    api.get<PostDetailResponse>(`/posts/${id}`, { params }),

  createComment: (payload: { postId: string; parentId?: string | null; content: string }) =>
    api.post("/comments", payload),

  editComment: (id: string, payload: { content: string }) =>
    api.put(`/comments/${id}`, payload),

  deleteComment: (id: string) =>
    api.delete(`/comments/${id}`),

  pinComment: (postId: string, commentId: string) =>
    api.post(`/posts/${postId}/pin`, { commentId }),

  acceptComment: (postId: string, commentId: string) =>
    api.post(`/posts/${postId}/accept`, { commentId }),

  searchComments: (params: { postId: string; q: string; page?: number; limit?: number }) =>
    api.get("/comments/search", { params }),

  vote: (payload: { targetType: "post" | "comment"; targetId: string; voteType: 1 | -1 }) =>
    api.post("/vote", payload),

  report: (payload: { targetId: string; reason: string }) => api.post("/report", payload),
};
