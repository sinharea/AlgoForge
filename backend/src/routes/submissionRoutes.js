const express = require("express");
const router = express.Router();

const auth = require("../middleware/authMiddleware");

const {
  createSubmission,
  getSubmissionById
} = require("../controllers/submissionController");

router.post("/", auth, createSubmission);
router.get("/:id", auth, getSubmissionById);

module.exports = router;
