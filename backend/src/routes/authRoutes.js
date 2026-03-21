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
const { authLimiter } = require("../middleware/rateLimiter");
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} = require("../validators/authValidator");

router.use(authLimiter);

router.post("/register", validate(registerSchema), register);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", validate(refreshSchema), refresh);
router.post("/logout", auth, logout);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
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
