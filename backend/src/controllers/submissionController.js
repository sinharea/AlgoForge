const Submission = require("../models/Submission");
const Problem = require("../models/Problem");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const submissionQueue = require("../queue/submissionQueue");
const { SUBMISSION_STATUS } = require("../constants");
const { queueEnabled } = require("../config/env");
const { ensureContestSubmissionAllowed, trackContestSubmission } = require("../services/contestService");
const { judgeSubmission, execute, normalize } = require("../services/executionService");
const { updateUserTopicAnalytics } = require("../services/analyticsService");

const processSubmissionNow = async (submission) => {
  const problem = await Problem.findById(submission.problem).select("testCases tags");
  if (!problem || !problem.testCases?.length) {
    submission.status = SUBMISSION_STATUS.FAILED;
    submission.verdict = "Runtime Error";
    submission.result = {
      stdout: "",
      stderr: "Problem test cases missing",
      compileOutput: "",
      passedCount: 0,
      totalCount: 0,
    };
    await submission.save();
    return submission;
  }

  const judged = await judgeSubmission({
    language: submission.language,
    code: submission.code,
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

  await updateUserTopicAnalytics({
    userId: submission.user,
    tags: problem.tags,
    solved: judged.verdict === "Accepted",
    runtime: judged.runtime,
  });

  if (submission.contest) {
    await trackContestSubmission({
      contestId: submission.contest,
      userId: submission.user,
      problemId: submission.problem,
      submissionId: submission._id,
      verdict: judged.verdict,
      runtime: judged.runtime,
    });
  }

  return submission;
};

const createSubmission = asyncHandler(async (req, res) => {
  const { problemId, language, code, contestId } = req.body;

  const problem = await Problem.findById(problemId).select("_id");
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

  if (queueEnabled && submissionQueue) {
    await submissionQueue.add(
      { submissionId: String(submission._id) },
      {
        attempts: 2,
        removeOnComplete: 200,
        removeOnFail: 200,
        backoff: { type: "exponential", delay: 1500 },
      }
    );
    return res.status(202).json({
      message: "Submission queued",
      submissionId: submission._id,
      status: submission.status,
    });
  }

  const processed = await processSubmissionNow(submission);
  return res.status(201).json({
    message: "Submission processed",
    submission: processed,
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

const runCode = asyncHandler(async (req, res) => {
  const { language, code, testCases } = req.body;

  const results = [];
  for (const tc of testCases) {
    const result = await execute({ language, code, stdin: tc.input || "" });
    const actualOutput = result.stdout || "";
    const passed = tc.expectedOutput !== undefined
      ? normalize(actualOutput) === normalize(tc.expectedOutput)
      : null;

    results.push({
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      actualOutput,
      stderr: result.stderr || "",
      passed,
      runtime: result.executionTime,
    });

    // If there's a runtime error, stop running remaining test cases
    if (result.stderr) break;
  }

  res.json({ results });
});

module.exports = {
  createSubmission,
  getSubmissionById,
  getMySubmissions,
  processSubmissionNow,
  runCode,
};
