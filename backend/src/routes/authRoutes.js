const express = require("express");
const router = express.Router();
const {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  me,
  updateMe,
} = require("../controllers/authController");
const { startOAuth, finishOAuth } = require("../controllers/oauthController");
const validate = require("../middleware/validate");
const auth = require("../middleware/auth");
const { uploadAvatar } = require("../middleware/uploadAvatar");
const { authLimiter, loginLimiter } = require("../middleware/rateLimiter");
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  updateProfileSchema,
} = require("../validators/authValidator");

// Apply general auth rate limiter to all routes
router.use(authLimiter);

router.post("/register", validate(registerSchema), register);
router.post("/login", loginLimiter, validate(loginSchema), login); // Extra strict limiter for login
router.post("/refresh", validate(refreshSchema), refresh);
router.post("/logout", auth, logout);
router.post("/forgot-password", loginLimiter, validate(forgotPasswordSchema), forgotPassword); // Extra strict for password reset
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);
router.post("/verify-email", validate(verifyEmailSchema), verifyEmail);
router.get("/me", auth, me);
router.patch("/me", auth, uploadAvatar.single("avatar"), validate(updateProfileSchema), updateMe);

router.get("/oauth/google", startOAuth("google", { scope: ["profile", "email"] }));
router.get("/oauth/google/callback", finishOAuth("google"));

router.get("/oauth/github", startOAuth("github", { scope: ["user:email"] }));
router.get("/oauth/github/callback", finishOAuth("github"));

module.exports = router;
