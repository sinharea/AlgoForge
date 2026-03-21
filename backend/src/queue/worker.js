const mongoose = require("mongoose");
const submissionQueue = require("./submissionQueue");
const Submission = require("../models/Submission");
const Problem = require("../models/Problem");
const connectDb = require("../config/db");
const { SUBMISSION_STATUS } = require("../constants");
const { judgeSubmission } = require("../services/executionService");
const { updateUserTopicAnalytics } = require("../services/analyticsService");
const { trackContestSubmission } = require("../services/contestService");
const logger = require("../utils/logger");

const startWorker = async () => {
  await connectDb();
  logger.info("Worker connected to MongoDB");

  submissionQueue.process(5, async (job) => {
    const { submissionId } = job.data;
    const submission = await Submission.findById(submissionId);
    if (!submission) return;

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
      return;
    }

    try {
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
  });

  submissionQueue.on("completed", (job) => {
    logger.info("Submission job completed", { id: job.id });
  });

  submissionQueue.on("failed", (job, err) => {
    logger.error("Submission job failed", { id: job?.id, error: err.message });
  });
};

startWorker().catch((err) => {
  logger.error("Worker startup failed", { error: err.message });
  mongoose.disconnect();
  process.exit(1);
});
