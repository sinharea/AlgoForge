const { z } = require("zod");

const supportedLanguages = ["cpp", "python", "java", "javascript", "go", "rust", "typescript"];

const createSubmissionSchema = z.object({
  problemId: z.string().min(10),
  language: z.enum(supportedLanguages),
  code: z.string().min(1),
  contestId: z.string().min(10).optional(),
});

const runCodeSchema = z.object({
  language: z.enum(supportedLanguages),
  code: z.string().min(1),
  testCases: z.array(
    z.object({
      input: z.string(),
      expectedOutput: z.string().optional(),
    })
  ).min(1).max(10),
});

module.exports = {
  createSubmissionSchema,
  runCodeSchema,
  supportedLanguages,
};
