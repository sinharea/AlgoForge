const Submission = require("../models/Submission");
const Problem = require("../models/Problem");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const submissionQueue = require("../queue/submissionQueue");
const { SUBMISSION_STATUS } = require("../constants");
const { ensureContestSubmissionAllowed } = require("../services/contestService");

const createSubmission = asyncHandler(async (req, res) => {
  const { problemId, language, code, contestId } = req.body;

  const problem = await Problem.findById(problemId).select("title");
  if (!problem) throw new ApiError(404, "Problem not found");

  if (contestId) {
    await ensureContestSubmissionAllowed({
      contestId,
      userId: req.user._id,
      problemId,
    });
  }

  const submission = await Submission.create({
    user: req.user._id,
    problem: problem._id,
    contest: contestId || undefined,
    language,
    code,
    status: SUBMISSION_STATUS.QUEUED,
  });

  await submissionQueue.add(
    { submissionId: String(submission._id) },
    {
      attempts: 2,
      removeOnComplete: 200,
      removeOnFail: 200,
      backoff: { type: "exponential", delay: 1500 },
    }
  );

  res.status(202).json({
    message: "Submission queued",
    submissionId: submission._id,
    status: submission.status,
  });
});

const getSubmissionById = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id)
    .populate("problem", "title slug difficulty")
    .populate("user", "name email role");

  if (!submission) throw new ApiError(404, "Submission not found");
  if (String(submission.user._id) !== String(req.user._id) && req.user.role !== "admin") {
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
