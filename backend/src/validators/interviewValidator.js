const { z } = require("zod");

const objectIdRegex = /^[a-fA-F0-9]{24}$/;
const objectId = z.string().regex(objectIdRegex, "Invalid ObjectId");

const startInterviewSchema = z.object({
  problemId: objectId,
});

const respondInterviewSchema = z.object({
  sessionId: objectId,
  userMessage: z.string().trim().min(1).max(2000),
});

const compareInterviewComplexitySchema = z.object({
  sessionId: objectId,
  userSolution: z.string().trim().min(1).max(8000).optional(),
});

const interviewSessionParamsSchema = z.object({
  sessionId: objectId,
});

const interviewMessagesQuerySchema = z.object({
  beforeIndex: z.coerce.number().int().nonnegative().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const endInterviewSchema = z.object({
  sessionId: objectId,
  status: z.enum(["completed", "abandoned"]).default("completed"),
});

const saveCodeSnapshotSchema = z.object({
  sessionId: objectId,
  code: z.string().trim().min(1).max(10000),
  language: z.enum(["cpp", "python", "javascript", "java", "go", "rust", "typescript"]),
});

const interviewHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  status: z.enum(["active", "completed", "abandoned", "all"]).default("all"),
  difficulty: z.enum(["Easy", "Medium", "Hard", "all"]).default("all"),
});

const generateTestCasesSchema = z.object({
  sessionId: objectId,
  userCode: z.string().trim().min(1).max(10000),
  language: z.enum(["cpp", "python", "javascript", "java", "go", "rust", "typescript"]),
});

module.exports = {
  startInterviewSchema,
  respondInterviewSchema,
  compareInterviewComplexitySchema,
  interviewSessionParamsSchema,
  interviewMessagesQuerySchema,
  endInterviewSchema,
  saveCodeSnapshotSchema,
  interviewHistoryQuerySchema,
  generateTestCasesSchema,
};
