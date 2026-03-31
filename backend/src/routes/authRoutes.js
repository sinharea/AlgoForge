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
} = require("../controllers/authController");
const { passport, oauthCallback } = require("../controllers/oauthController");
const validate = require("../middleware/validate");
const auth = require("../middleware/auth");
const { authLimiter, loginLimiter } = require("../middleware/rateLimiter");
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
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

router.get("/oauth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get(
  "/oauth/google/callback",
  passport.authenticate("google", { session: false }),
  oauthCallback
);

router.get("/oauth/github", passport.authenticate("github", { scope: ["user:email"] }));
router.get(
  "/oauth/github/callback",
  passport.authenticate("github", { session: false }),
  oauthCallback
);

module.exports = router;
