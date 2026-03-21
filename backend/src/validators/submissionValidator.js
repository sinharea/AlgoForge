const { z } = require("zod");

const createSubmissionSchema = z.object({
  problemId: z.string().min(10),
  language: z.enum(["cpp", "python", "java", "javascript"]),
  code: z.string().min(1),
  contestId: z.string().min(10).optional(),
});

module.exports = {
  createSubmissionSchema,
};
