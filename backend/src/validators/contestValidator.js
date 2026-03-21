const { z } = require("zod");

const createContestSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  duration: z.number().int().positive(),
  problems: z.array(z.string().min(10)).min(1),
});

module.exports = {
  createContestSchema,
};
