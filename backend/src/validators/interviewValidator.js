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

module.exports = {
  startInterviewSchema,
  respondInterviewSchema,
  compareInterviewComplexitySchema,
  interviewSessionParamsSchema,
  interviewMessagesQuerySchema,
};
