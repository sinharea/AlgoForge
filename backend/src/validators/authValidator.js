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
    avatarUrl: z.string().max(500).optional(),
    currentPassword: z.string().min(8).max(128).optional(),
    newPassword: z.string().min(8).max(128).optional(),
  })
  .refine(
    (value) => {
      const profileChanged = value.name !== undefined || value.avatarUrl !== undefined;
      const passwordChanged = value.currentPassword !== undefined || value.newPassword !== undefined;
      return profileChanged || passwordChanged;
    },
    { message: "At least one field is required" }
  )
  .refine(
    (value) => {
      const hasCurrent = value.currentPassword !== undefined;
      const hasNew = value.newPassword !== undefined;
      return hasCurrent === hasNew;
    },
    { message: "Provide both currentPassword and newPassword" }
  )
  .refine(
    (value) => !value.avatarUrl || /^https?:\/\//i.test(value.avatarUrl),
    { message: "avatarUrl must be a valid http(s) URL" }
  );

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  updateProfileSchema,
};
