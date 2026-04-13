const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const { submissionLimiter, runLimiter } = require("../middleware/rateLimiter");
const { createSubmissionSchema, runCodeSchema, submissionIdParamsSchema } = require("../validators/submissionValidator");

const {
  createSubmission,
  getSubmissionById,
  getSubmissionReview,
  getMySubmissions,
  runCode,
} = require("../controllers/submissionController");

// All routes require authentication
router.use(auth);

// Get user's submissions - no rate limit needed
router.get("/me", getMySubmissions);

// Submit code - stricter rate limit
router.post("/", submissionLimiter, validate(createSubmissionSchema), createSubmission);

// Run code (without submitting) - more lenient rate limit
router.post("/run", runLimiter, validate(runCodeSchema), runCode);

// Get AI review for a specific submission
router.get("/:id/review", validate(submissionIdParamsSchema, "params"), getSubmissionReview);

// Get specific submission
router.get("/:id", validate(submissionIdParamsSchema, "params"), getSubmissionById);

module.exports = router;
