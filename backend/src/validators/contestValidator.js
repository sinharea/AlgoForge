const { z } = require("zod");

const createContestSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  duration: z.number().int().positive(),
  problems: z.array(z.string().min(10)).min(1),
});

const updateContestSchema = createContestSchema
  .partial()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required to update contest",
  });

module.exports = {
  createContestSchema,
  updateContestSchema,
};
