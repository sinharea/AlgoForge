const rateLimit = require("express-rate-limit");

// Authentication rate limiter - stricter to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Reduced from 30 - 10 attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMIT", message: "Too many auth requests, please try again after 15 minutes." } },
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Login-specific limiter - even stricter
const loginLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 failed attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMIT", message: "Too many login attempts, please try again after 1 hour." } },
  skipSuccessfulRequests: true,
});

// Submission rate limiter
const submissionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Reduced from 20 - 10 submissions per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMIT", message: "Too many submissions, please wait a minute." } },
});

// Code run rate limiter - slightly more lenient than submissions
const runLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 runs per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMIT", message: "Too many code executions, please wait a moment." } },
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "RATE_LIMIT", message: "Too many requests, please slow down." } },
});

module.exports = {
  authLimiter,
  loginLimiter,
  submissionLimiter,
  runLimiter,
  apiLimiter,
};
