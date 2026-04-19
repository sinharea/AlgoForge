const mongoose = require("mongoose");

const weaknessSnapshotSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    period: {
      type: String,
      required: true,
    },
    totalSolved: Number,
    weakTopicCount: Number,
    avgWeakAccuracy: Number,
    avgWeakAttempts: Number,
    firstAttemptSuccessRate: Number,
    topicSnapshots: [
      {
        topic: String,
        accuracy: Number,
        totalAttempts: Number,
        totalSolved: Number,
      },
    ],
  },
  { timestamps: true }
);

weaknessSnapshotSchema.index({ userId: 1, period: 1 }, { unique: true });

module.exports = mongoose.model("WeaknessSnapshot", weaknessSnapshotSchema);
