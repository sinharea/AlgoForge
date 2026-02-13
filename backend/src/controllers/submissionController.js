
const Submission = require("../models/Submission");
const Problem = require("../models/Problem");     // 👈 THIS WAS MISSING
const submissionQueue = require("../queue/submissionQueue");


exports.createSubmission = async (req, res) => {
  try {
    const { problemId, language, code } = req.body;

    if (!problemId || !language || !code) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const allowedLanguages = ["cpp", "python", "java"];

    if (!allowedLanguages.includes(language)) {
      return res.status(400).json({ message: "Unsupported language" });
    }

    const problem = await Problem.findById(problemId);

    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    const submission = await Submission.create({
      userId: req.user._id, // confirm this matches your authMiddleware
      problemId,
      language,
      code,
      verdict: "Pending"
    });

    await submissionQueue.add({
      submissionId: submission._id
    });

    res.status(201).json({
      message: "Submission queued",
      submissionId: submission._id
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getSubmissionById = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate("problemId")
      .populate("userId", "username email");

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Optional: restrict access (only owner or admin)
    if (
      submission.userId._id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json(submission);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
