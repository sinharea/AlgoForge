const mongoose = require("mongoose");

const problemStatsSchema = new mongoose.Schema(
  {
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
      unique: true,
      index: true,
    },
    totalSubmissions: {
      type: Number,
      default: 0,
    },
    acceptedSubmissions: {
      type: Number,
      default: 0,
    },
    acceptanceRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    totalAttemptedUsers: {
      type: Number,
      default: 0,
    },
    totalSolvedUsers: {
      type: Number,
      default: 0,
    },
    avgRuntime: {
      type: Number,
      default: 0,
    },
    avgMemory: {
      type: Number,
      default: 0,
    },
    languageBreakdown: {
      type: Map,
      of: Number,
      default: {},
    },
    lastSubmittedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

problemStatsSchema.index({ acceptanceRate: -1 });
problemStatsSchema.index({ totalSubmissions: -1 });

module.exports = mongoose.model("ProblemStats", problemStatsSchema);
