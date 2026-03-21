const Submission = require("../models/Submission");
const Problem = require("../models/Problem");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { SUBMISSION_STATUS } = require("../constants");
const { judgeSubmission } = require("../services/executionService");

const createSubmission = asyncHandler(async (req, res) => {
  const { problemId, language, code } = req.body;

  const problem = await Problem.findById(problemId).select("testCases title");
  if (!problem) throw new ApiError(404, "Problem not found");

  const submission = await Submission.create({
    user: req.user._id,
    problem: problem._id,
    language,
    code,
    status: SUBMISSION_STATUS.QUEUED,
  });

  try {
    const judged = await judgeSubmission({
      language,
      code,
      testCases: problem.testCases,
    });

    submission.status = SUBMISSION_STATUS.COMPLETED;
    submission.verdict = judged.verdict;
    submission.runtime = judged.runtime;
    submission.result = {
      stdout: judged.stdout,
      stderr: judged.stderr,
      compileOutput: judged.compileOutput,
      passedCount: judged.passedCount,
      totalCount: judged.totalCount,
    };
    await submission.save();
  } catch (error) {
    submission.status = SUBMISSION_STATUS.FAILED;
    submission.verdict = "Runtime Error";
    submission.result = {
      stdout: "",
      stderr: error.message,
      compileOutput: "",
      passedCount: 0,
      totalCount: problem.testCases.length,
    };
    await submission.save();
    throw error;
  }

  res.status(201).json({
    message: "Submission processed",
    submission,
  });
});

const getSubmissionById = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id)
    .populate("problem", "title slug difficulty")
    .populate("user", "name email role");

  if (!submission) throw new ApiError(404, "Submission not found");

  if (
    String(submission.user._id) !== String(req.user._id) &&
    req.user.role !== "admin"
  ) {
    throw new ApiError(403, "Unauthorized");
  }

  res.json(submission);
});

const getMySubmissions = asyncHandler(async (req, res) => {
  const submissions = await Submission.find({ user: req.user._id })
    .populate("problem", "title slug difficulty")
    .sort({ createdAt: -1 });

  res.json(submissions);
});

module.exports = {
  createSubmission,
  getSubmissionById,
  getMySubmissions,
};
