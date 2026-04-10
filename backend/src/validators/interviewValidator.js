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

const interviewSessionParamsSchema = z.object({
  sessionId: objectId,
});

module.exports = {
  startInterviewSchema,
  respondInterviewSchema,
  interviewSessionParamsSchema,
};
