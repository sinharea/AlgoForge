const { z } = require("zod");
const { DIFFICULTY } = require("../constants");

const testCaseSchema = z.object({
  input: z.string(),
  expectedOutput: z.string(),
});

const optimalComplexitySchema = z.object({
  time: z.string().trim().max(80).optional(),
  space: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const createProblemSchema = z.object({
  questionNumber: z.number().int().positive().optional(),
  title: z.string().min(3).max(200),
  slug: z.string().min(3).max(220).optional(),
  description: z.string().min(10),
  difficulty: z.enum([
    DIFFICULTY.EASY,
    DIFFICULTY.MEDIUM,
    DIFFICULTY.HARD,
  ]),
  tags: z.array(z.string().min(1)).default([]),
  constraints: z.string().optional(),
  editorialSolution: z.string().max(100000).optional(),
  optimalComplexity: optimalComplexitySchema.optional(),
  testCases: z.array(testCaseSchema).min(1),
  sampleTestCases: z.array(testCaseSchema).default([]),
  timeLimit: z.number().int().positive().max(10000).default(2000),
  memoryLimit: z.number().int().positive().max(1024).default(128),
});

const updateProblemSchema = createProblemSchema.partial();

const problemQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  difficulty: z.string().optional(),
  tags: z.string().optional(),
  search: z.string().optional(),
});

module.exports = {
  createProblemSchema,
  updateProblemSchema,
  problemQuerySchema,
};
