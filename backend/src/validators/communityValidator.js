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
  sort: z.enum(["newest", "most_votes"]).default("newest"),
});

const postParamsSchema = z.object({
  id: objectId,
});

const postDetailQuerySchema = z.object({
  commentsLimit: z.coerce.number().int().positive().max(500).default(200),
});

const createCommentSchema = z.object({
  postId: objectId,
  parentId: z.union([objectId, z.null()]).optional(),
  content: z.string().trim().min(1).max(2000),
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

module.exports = {
  createPostSchema,
  listPostsQuerySchema,
  postParamsSchema,
  postDetailQuerySchema,
  createCommentSchema,
  createVoteSchema,
  createReportSchema,
};
