const { z } = require("zod");
const { DIFFICULTY } = require("../constants");

const objectIdRegex = /^[a-fA-F0-9]{24}$/;
const objectId = z.string().regex(objectIdRegex, "Invalid ObjectId");

const adminProblemCreateSchema = z.object({
  questionNumber: z.number().int().positive().optional(),
  title: z.string().trim().min(3).max(200),
  slug: z.string().trim().min(3).max(220).optional(),
  description: z.string().trim().min(10),
  difficulty: z.enum([DIFFICULTY.EASY, DIFFICULTY.MEDIUM, DIFFICULTY.HARD]),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  constraints: z.string().trim().max(5000).optional(),
  editorialSolution: z.string().trim().max(100000).optional(),
  timeLimit: z.number().int().positive().max(10000).default(2000),
  memoryLimit: z.number().int().positive().max(1024).default(128),
});

const adminProblemUpdateSchema = adminProblemCreateSchema
  .partial()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required",
  });

const adminProblemIdParamsSchema = z.object({
  id: objectId,
});

const adminContestCreateSchema = z.object({
  name: z.string().trim().min(3).max(200),
  description: z.string().trim().max(4000).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  problemIds: z.array(objectId).min(1),
});

const adminContestUpdateSchema = adminContestCreateSchema
  .partial()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required",
  });

const adminUserQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  role: z.enum(["admin", "user"]).optional(),
  status: z.enum(["active", "banned"]).optional(),
});

const adminToggleBanSchema = z.object({
  userId: objectId,
});

const adminReportQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(["pending", "resolved", "open", "under_review", "rejected"]).optional(),
});

const adminReportActionSchema = z.object({
  reportId: objectId,
  action: z.enum(["delete", "ignore"]),
});

module.exports = {
  adminProblemCreateSchema,
  adminProblemUpdateSchema,
  adminProblemIdParamsSchema,
  adminContestCreateSchema,
  adminContestUpdateSchema,
  adminUserQuerySchema,
  adminToggleBanSchema,
  adminReportQuerySchema,
  adminReportActionSchema,
};
