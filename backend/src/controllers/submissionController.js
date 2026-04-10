const Submission = require("../models/Submission");
const Problem = require("../models/Problem");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const submissionQueue = require("../queue/submissionQueue");
const { SUBMISSION_STATUS, VERDICTS } = require("../constants");
const { queueEnabled } = require("../config/env");
const { ensureContestSubmissionAllowed, trackContestSubmission } = require("../services/contestService");
const { judgeSubmission, execute, normalize, truncateOutput } = require("../services/executionService");
const { updateUserTopicAnalytics, updateUserTopicStats } = require("../services/analyticsService");
const logger = require("../utils/logger");

// Duplicate submission prevention: track recent submissions per user
const recentSubmissions = new Map();
const DUPLICATE_WINDOW_MS = 5000; // 5 second window

const isDuplicateSubmission = (userId, problemId, code) => {
  const key = `${userId}:${problemId}`;
  const recent = recentSubmissions.get(key);

  if (recent && Date.now() - recent.timestamp < DUPLICATE_WINDOW_MS) {
    // Allow if code is different
    if (recent.codeHash === code.substring(0, 500)) {
      return true;
    }
  }

  recentSubmissions.set(key, {
    timestamp: Date.now(),
    codeHash: code.substring(0, 500),
  });

  // Clean up old entries periodically
  if (recentSubmissions.size > 1000) {
    const now = Date.now();
    for (const [k, v] of recentSubmissions.entries()) {
      if (now - v.timestamp > DUPLICATE_WINDOW_MS * 2) {
        recentSubmissions.delete(k);
      }
    }
  }

  return false;
};

const processSubmissionNow = async (submission) => {
  // Update status to JUDGING
  submission.status = SUBMISSION_STATUS.JUDGING;
  await submission.save();

  const problem = await Problem.findById(submission.problem).select("testCases tags timeLimit memoryLimit");

  if (!problem || !problem.testCases?.length) {
    submission.status = SUBMISSION_STATUS.FAILED;
    submission.verdict = VERDICTS.RUNTIME_ERROR;
    submission.result = {
      stdout: "",
      stderr: "Problem test cases missing or invalid",
      compileOutput: "",
      passedCount: 0,
      totalCount: 0,
    };
    await submission.save();
    return submission;
  }

  try {
    const judged = await judgeSubmission({
      language: submission.language,
      code: submission.code,
      testCases: problem.testCases,
      timeLimit: problem.timeLimit || 2000,
      memoryLimit: problem.memoryLimit || 256,
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
      failedTestCase: judged.failedTestCase,
      expectedOutput: judged.expectedOutput,
      actualOutput: judged.actualOutput,
    };
    await submission.save();

    // Update analytics
    try {
      await updateUserTopicAnalytics({
        userId: submission.user,
        tags: problem.tags,
        solved: judged.verdict === VERDICTS.ACCEPTED,
        runtime: judged.runtime,
      });

      await updateUserTopicStats({
        userId: submission.user,
        tags: problem.tags,
        solved: judged.verdict === VERDICTS.ACCEPTED,
      });
    } catch (analyticsErr) {
      logger.warn("Failed to update analytics", { error: analyticsErr.message });
    }

    // Track contest submission if applicable
    if (submission.contest) {
      try {
        await trackContestSubmission({
          contestId: submission.contest,
          userId: submission.user,
          problemId: submission.problem,
          submissionId: submission._id,
          verdict: judged.verdict,
          runtime: judged.runtime,
        });
      } catch (contestErr) {
        logger.warn("Failed to track contest submission", { error: contestErr.message });
      }
    }

    return submission;
  } catch (error) {
    logger.error("Submission processing failed", {
      submissionId: submission._id,
      error: error.message,
    });

    submission.status = SUBMISSION_STATUS.FAILED;
    submission.verdict = VERDICTS.RUNTIME_ERROR;
    submission.result = {
      stdout: "",
      stderr: truncateOutput(error.message),
      compileOutput: "",
      passedCount: 0,
      totalCount: problem.testCases?.length || 0,
    };
    await submission.save();
    return submission;
  }
};

const createSubmission = asyncHandler(async (req, res) => {
  const { problemId, language, code, contestId } = req.body;

  // Check for duplicate submission (rapid fire prevention)
  if (isDuplicateSubmission(String(req.user._id), problemId, code)) {
    throw new ApiError(429, "Please wait a few seconds before submitting again");
  }

  const problem = await Problem.findById(problemId).select("_id testCases");
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

  logger.info("Submission created", {
    submissionId: submission._id,
    userId: req.user._id,
    problemId,
    language,
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

  // Process synchronously if queue is not enabled
  const processed = await processSubmissionNow(submission);
  return res.status(201).json({
    message: "Submission processed",
    submission: {
      _id: processed._id,
      status: processed.status,
      verdict: processed.verdict,
      runtime: processed.runtime,
      result: processed.result,
    },
  });
});

const getSubmissionById = asyncHandler(async (req, res) => {
  const submission = await Submission.findById(req.params.id)
    .populate("problem", "title slug difficulty")
    .populate("user", "name email role");

  if (!submission) throw new ApiError(404, "Submission not found");

  // Authorization check: user can only view their own submissions (or admin can view all)
  if (String(submission.user._id) !== String(req.user._id) && req.user.role !== "admin") {
    throw new ApiError(403, "Unauthorized to view this submission");
  }

  res.json(submission);
});

const getMySubmissions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, problemId } = req.query;
  const query = { user: req.user._id };

  if (problemId) {
    query.problem = problemId;
  }

  const submissions = await Submission.find(query)
    .populate("problem", "title slug difficulty")
    .sort({ createdAt: -1 })
    .limit(parseInt(limit, 10))
    .skip((parseInt(page, 10) - 1) * parseInt(limit, 10));

  const total = await Submission.countDocuments(query);

  res.json({
    items: submissions,
    total,
    page: parseInt(page, 10),
    pages: Math.ceil(total / parseInt(limit, 10)),
  });
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
      actualOutput: truncateOutput(actualOutput),
      stderr: truncateOutput(result.stderr || ""),
      passed,
      runtime: result.executionTime,
      timedOut: result.timedOut || false,
    });

    // If there's a runtime error or timeout, stop running remaining test cases
    if (result.stderr || result.timedOut) break;
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
