const mongoose = require("mongoose");

const recFeedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
    },
    modelVersion: {
      type: String,
      default: "v1-heuristic",
    },
    impressionAt: Date,
    clickedAt: Date,
    attemptedAt: Date,
    solvedAt: Date,
    skippedAt: Date,
    dwellSeconds: Number,
    attemptCount: { type: Number, default: 0 },
    outcome: { type: Number, min: 0, max: 1 },
  },
  { timestamps: true }
);

recFeedbackSchema.index({ userId: 1, problemId: 1, modelVersion: 1 });
recFeedbackSchema.index({ userId: 1, createdAt: -1 });
recFeedbackSchema.index({ modelVersion: 1 });

module.exports = mongoose.model("RecFeedback", recFeedbackSchema);
