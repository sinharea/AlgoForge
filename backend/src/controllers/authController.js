const asyncHandler = require("../utils/asyncHandler");
const {
  registerUser,
  loginUser,
  refreshSession,
  logoutSession,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  getMyProfile,
  updateMyProfile,
} = require("../services/authService");

const register = asyncHandler(async (req, res) => {
  const data = await registerUser(req.body);
  res.status(201).json(data);
});

const login = asyncHandler(async (req, res) => {
  const data = await loginUser(req.body);
  res.json(data);
});

const refresh = asyncHandler(async (req, res) => {
  const data = await refreshSession(req.body);
  res.json(data);
});

const logout = asyncHandler(async (req, res) => {
  await logoutSession({ userId: req.user._id });
  res.json({ message: "Logged out" });
});

const forgotPassword = asyncHandler(async (req, res) => {
  await requestPasswordReset(req.body);
  res.json({ message: "If that email exists, reset instructions were sent." });
});

const resetPasswordHandler = asyncHandler(async (req, res) => {
  await resetPassword(req.body);
  res.json({ message: "Password reset successful" });
});

const verifyEmailHandler = asyncHandler(async (req, res) => {
  await verifyEmail(req.body);
  res.json({ message: "Email verified successfully" });
});

const me = asyncHandler(async (req, res) => {
  const user = await getMyProfile({ userId: req.user._id });
  res.json({ user });
});

const updateMe = asyncHandler(async (req, res) => {
  const uploadedAvatarUrl = req.file
    ? `${req.protocol}://${req.get("host")}/uploads/avatars/${req.file.filename}`
    : undefined;

  const user = await updateMyProfile({
    userId: req.user._id,
    ...req.body,
    ...(uploadedAvatarUrl ? { avatarUrl: uploadedAvatarUrl } : {}),
  });
  res.json({ user });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword: resetPasswordHandler,
  verifyEmail: verifyEmailHandler,
  me,
  updateMe,
};
