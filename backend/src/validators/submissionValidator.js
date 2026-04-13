const { z } = require("zod");

const supportedLanguages = ["cpp", "python", "java", "javascript", "go", "rust", "typescript"];

// Maximum code size: 64KB (65536 characters)
const MAX_CODE_SIZE = 65536;

const createSubmissionSchema = z.object({
  problemId: z.string().min(10),
  language: z.enum(supportedLanguages),
  code: z.string().min(1).max(MAX_CODE_SIZE, "Code exceeds maximum size of 64KB"),
  contestId: z.string().min(10).optional(),
});

const runCodeSchema = z.object({
  language: z.enum(supportedLanguages),
  code: z.string().min(1).max(MAX_CODE_SIZE, "Code exceeds maximum size of 64KB"),
  testCases: z.array(
    z.object({
      input: z.string().max(10000, "Input exceeds maximum size of 10KB"),
      expectedOutput: z.string().max(10000, "Expected output exceeds maximum size of 10KB").optional(),
    })
  ).min(1).max(10),
});

const submissionIdParamsSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid submission id"),
});

module.exports = {
  createSubmissionSchema,
  runCodeSchema,
  submissionIdParamsSchema,
  supportedLanguages,
  MAX_CODE_SIZE,
};
