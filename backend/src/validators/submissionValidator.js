const { z } = require("zod");
const { SUPPORTED_LANGUAGES } = require("../constants");

// Maximum code size: 64KB (65536 characters)
const MAX_CODE_SIZE = 65536;

const createSubmissionSchema = z.object({
  problemId: z.string().min(10),
  language: z.enum(SUPPORTED_LANGUAGES),
  code: z.string().min(1).max(MAX_CODE_SIZE, "Code exceeds maximum size of 64KB"),
  contestId: z.string().min(10).optional(),
});

const runCodeSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES),
  code: z.string().min(1).max(MAX_CODE_SIZE, "Code exceeds maximum size of 64KB"),
  testCases: z.array(
    z.object({
      input: z.string().max(10000, "Input exceeds maximum size of 10KB"),
      expectedOutput: z.string().max(10000, "Expected output exceeds maximum size of 10KB").optional(),
    })
  ).min(1).max(10),
});

const aiSubmissionTestCaseSchema = z.object({
  problemId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid problem id"),
  submissionId: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid submission id").optional(),
  language: z.enum(SUPPORTED_LANGUAGES),
  code: z.string().min(1).max(MAX_CODE_SIZE, "Code exceeds maximum size of 64KB"),
});

const submissionIdParamsSchema = z.object({
  id: z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid submission id"),
});

module.exports = {
  createSubmissionSchema,
  runCodeSchema,
  aiSubmissionTestCaseSchema,
  submissionIdParamsSchema,
  supportedLanguages: SUPPORTED_LANGUAGES,
  MAX_CODE_SIZE,
};
