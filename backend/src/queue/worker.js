const mongoose = require("mongoose");
const submissionQueue = require("./submissionQueue");
const Submission = require("../models/Submission");
const connectDb = require("../config/db");
const { queueEnabled } = require("../config/env");
const { processSubmissionNow } = require("../controllers/submissionController");
const logger = require("../utils/logger");

const startWorker = async () => {
  if (!queueEnabled || !submissionQueue) {
    logger.info("Queue disabled; worker exiting.");
    return;
  }

  await connectDb();
  logger.info("Worker connected to MongoDB");

  submissionQueue.process(5, async (job) => {
    const { submissionId } = job.data;
    const submission = await Submission.findById(submissionId);
    if (!submission) return;
    await processSubmissionNow(submission);
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
