const { z } = require("zod");

const objectIdRegex = /^[a-fA-F0-9]{24}$/;
const objectId = z.string().regex(objectIdRegex, "Invalid ObjectId");

const createPostSchema = z.object({
  problemId: objectId,
  title: z.string().trim().min(3).max(220),
  content: z.string().trim().min(1).max(10000),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
});

const listPostsQuerySchema = z.object({
  problemId: objectId,
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  sort: z.enum(["newest", "most_votes", "hot"]).default("newest"),
  search: z.string().trim().max(200).optional(),
});

const postParamsSchema = z.object({
  id: objectId,
});

const postDetailQuerySchema = z.object({
  commentsLimit: z.coerce.number().int().positive().max(500).default(200),
  commentSort: z.enum(["newest", "oldest", "top"]).default("oldest"),
});

const createCommentSchema = z.object({
  postId: objectId,
  parentId: z.union([objectId, z.null()]).optional(),
  content: z.string().trim().min(1).max(2000),
});

const editCommentSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

const commentParamsSchema = z.object({
  id: objectId,
});

const createVoteSchema = z.object({
  targetType: z.enum(["post", "comment"]),
  targetId: objectId,
  voteType: z.union([z.literal(1), z.literal(-1)]),
});

const createReportSchema = z.object({
  targetId: objectId,
  reason: z.string().trim().min(5).max(500),
});

const pinCommentSchema = z.object({
  commentId: objectId,
});

const acceptCommentSchema = z.object({
  commentId: objectId,
});

const searchCommentsQuerySchema = z.object({
  postId: objectId,
  q: z.string().trim().min(1).max(200),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

module.exports = {
  createPostSchema,
  listPostsQuerySchema,
  postParamsSchema,
  postDetailQuerySchema,
  createCommentSchema,
  editCommentSchema,
  commentParamsSchema,
  createVoteSchema,
  createReportSchema,
  pinCommentSchema,
  acceptCommentSchema,
  searchCommentsQuerySchema,
};
