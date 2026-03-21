const submissionQueue = require("./submissionQueue");
const Submission = require("../models/Submission");
const { SUBMISSION_STATUS } = require("../constants");
const { judgeSubmission } = require("../services/executionService");
const mongoose = require("mongoose");
require("dotenv").config();

console.log("Worker starting...");

// Mongo connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("Worker MongoDB Connected"))
  .catch(err => console.error("Worker DB Error:", err));

// Queue connection debug
submissionQueue.on("ready", () => {
  console.log("Queue is ready and connected to Redis");
});

submissionQueue.on("error", (err) => {
  console.error("Queue error:", err);
});

submissionQueue.process(async (job) => {

  console.log("Job received from queue");

  const { submissionId } = job.data;
  console.log("Processing submission:", submissionId);

  const submission = await Submission.findById(submissionId).populate("problem");

  if (!submission) {
    console.log("Submission not found");
    return;
  }

  const problem = submission.problem;

  if (!problem || !problem.testCases?.length) {
    await Submission.findByIdAndUpdate(submissionId, {
      status: SUBMISSION_STATUS.FAILED,
      verdict: "Runtime Error",
      result: {
        stdout: "",
        stderr: "Problem does not contain test cases",
        compileOutput: "",
        passedCount: 0,
        totalCount: 0,
      },
    });
    console.log("No test cases found");
    return;
  }
  const judged = await judgeSubmission({
    language: submission.language,
    code: submission.code,
    testCases: problem.testCases,
  });

  await Submission.findByIdAndUpdate(submissionId, {
    status: SUBMISSION_STATUS.COMPLETED,
    verdict: judged.verdict,
    runtime: judged.runtime,
    result: {
      stdout: judged.stdout,
      stderr: judged.stderr,
      compileOutput: judged.compileOutput,
      passedCount: judged.passedCount,
      totalCount: judged.totalCount,
    },
  });

  console.log("Submission evaluated:", judged.verdict);
});
