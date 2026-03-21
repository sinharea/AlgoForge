const slugify = require("slugify");
const User = require("../models/User");
const ApiError = require("../utils/apiError");
const { generateToken, sha256 } = require("../utils/crypto");
const { sendEmail } = require("./emailService");
const {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
} = require("./tokenService");
const { frontendUrl } = require("../config/env");
const { AUTH_PROVIDER } = require("../constants");

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  provider: user.provider,
  isEmailVerified: user.isEmailVerified,
});

const issueTokensForUser = async (user) => {
  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken(user);
  user.refreshTokenHash = hashRefreshToken(refreshToken);
  await user.save();
  return { accessToken, refreshToken };
};

const registerUser = async ({ name, email, password }) => {
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, "Email already in use");

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    provider: AUTH_PROVIDER.LOCAL,
  });

  const emailToken = generateToken();
  user.emailVerificationTokenHash = sha256(emailToken);
  user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  await sendEmail({
    to: user.email,
    subject: "Verify your AlgoForge email",
    html: `<p>Verify your email:</p><p><a href="${frontendUrl}/verify-email?token=${emailToken}">Verify Email</a></p>`,
  });

  const tokens = await issueTokensForUser(user);
  return { user: sanitizeUser(user), ...tokens };
};

const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user || user.provider !== AUTH_PROVIDER.LOCAL) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) throw new ApiError(401, "Invalid credentials");

  const tokens = await issueTokensForUser(user);
  return { user: sanitizeUser(user), ...tokens };
};

const refreshSession = async ({ refreshToken }) => {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const user = await User.findById(payload.sub).select("+refreshTokenHash");
  if (!user) throw new ApiError(401, "User not found");

  if (user.refreshTokenHash !== hashRefreshToken(refreshToken)) {
    throw new ApiError(401, "Refresh token mismatch");
  }

  const tokens = await issueTokensForUser(user);
  return { user: sanitizeUser(user), ...tokens };
};

const logoutSession = async ({ userId }) => {
  await User.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: 1 } });
};

const requestPasswordReset = async ({ email }) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return;

  const resetToken = generateToken();
  user.passwordResetTokenHash = sha256(resetToken);
  user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();

  await sendEmail({
    to: user.email,
    subject: "Reset your AlgoForge password",
    html: `<p>Reset link (15 min):</p><p><a href="${frontendUrl}/reset-password?token=${resetToken}">Reset Password</a></p>`,
  });
};

const resetPassword = async ({ token, newPassword }) => {
  const user = await User.findOne({
    passwordResetTokenHash: sha256(token),
    passwordResetExpiresAt: { $gt: new Date() },
  }).select("+password");

  if (!user) throw new ApiError(400, "Invalid or expired reset token");

  user.password = newPassword;
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.refreshTokenHash = undefined;
  await user.save();
};

const verifyEmail = async ({ token }) => {
  const user = await User.findOne({
    emailVerificationTokenHash: sha256(token),
    emailVerificationExpiresAt: { $gt: new Date() },
  });

  if (!user) throw new ApiError(400, "Invalid or expired verification token");

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  await user.save();
};

const upsertOAuthUser = async ({ email, name, provider, oauthId }) => {
  let user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    user = await User.create({
      email: email.toLowerCase(),
      name: name || slugify(email.split("@")[0], { lower: false }),
      provider,
      oauthId,
      isEmailVerified: true,
    });
  } else if (!user.oauthId) {
    user.provider = provider;
    user.oauthId = oauthId;
    user.isEmailVerified = true;
    await user.save();
  }

  const tokens = await issueTokensForUser(user);
  return { user: sanitizeUser(user), ...tokens };
};

module.exports = {
  registerUser,
  loginUser,
  refreshSession,
  logoutSession,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  upsertOAuthUser,
};
