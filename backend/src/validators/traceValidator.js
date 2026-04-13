const { z } = require("zod");

const MAX_CODE_SIZE = 65536;
const MAX_INPUT_SIZE = 10000;

const traceRequestSchema = z.object({
  code: z.string().min(1).max(MAX_CODE_SIZE, "Code exceeds maximum size of 64KB"),
  input: z.string().max(MAX_INPUT_SIZE, "Input exceeds maximum size of 10KB").default(""),
  language: z.literal("python"),
});

module.exports = {
  traceRequestSchema,
};
