const { z } = require("zod");

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8).max(128),
});

const verifyEmailSchema = z.object({
  token: z.string().min(10),
});

const updateProfileSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    avatarUrl: z
      .string()
      .max(500)
      .optional()
      .refine((value) => !value || /^https?:\/\//i.test(value), {
        message: "avatarUrl must be a valid http(s) URL",
      }),
  })
  .refine((value) => value.name !== undefined || value.avatarUrl !== undefined, {
    message: "At least one field is required",
  });

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  updateProfileSchema,
};
