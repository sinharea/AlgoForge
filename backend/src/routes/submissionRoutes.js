const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const validate = require("../middleware/validate");
const { submissionLimiter } = require("../middleware/rateLimiter");
const { createSubmissionSchema } = require("../validators/submissionValidator");

const {
  createSubmission,
  getSubmissionById,
  getMySubmissions,
} = require("../controllers/submissionController");

router.use(auth, submissionLimiter);

router.get("/me", getMySubmissions);
router.post("/", validate(createSubmissionSchema), createSubmission);
router.get("/:id", getSubmissionById);

module.exports = router;
