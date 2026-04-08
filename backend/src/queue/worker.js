const mongoose = require("mongoose");
const submissionQueue = require("./submissionQueue");
const Submission = require("../models/Submission");
const connectDb = require("../config/db");
const { queueEnabled } = require("../config/env");
const { processSubmissionNow } = require("../controllers/submissionController");
const logger = require("../utils/logger");

// Global error handlers for worker process
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection in worker", { reason, promise });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception in worker", { error: error.message, stack: error.stack });
  // Clean up and exit
  mongoose.disconnect();
  process.exit(1);
});

const startWorker = async () => {
  if (!queueEnabled || !submissionQueue) {
    logger.info("Queue disabled; worker exiting.");
    return;
  }

  await connectDb();
  logger.info("Worker connected to MongoDB");

  // Set up mongoose connection event listeners
  mongoose.connection.on("error", (err) => {
    logger.error("Worker MongoDB connection error", { error: err.message });
  });

  mongoose.connection.on("disconnected", () => {
    logger.warn("Worker MongoDB disconnected");
  });

  // Add error handler for the queue itself
  submissionQueue.on("error", (error) => {
    logger.error("Queue error", { error: error.message });
  });

  submissionQueue.process(5, async (job) => {
    try {
      const { submissionId } = job.data;
      const submission = await Submission.findById(submissionId);
      if (!submission) {
        logger.warn("Submission not found for job", { submissionId, jobId: job.id });
        return;
      }
      await processSubmissionNow(submission);
    } catch (error) {
      logger.error("Error processing submission job", {
        jobId: job.id,
        error: error.message,
        stack: error.stack,
      });
      throw error; // Re-throw to mark job as failed
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
