const mongoose = require("mongoose");

const userTopicStatsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    totalAttempts: {
      type: Number,
      default: 0,
    },
    totalSolved: {
      type: Number,
      default: 0,
    },
    accuracy: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    easyAttempts: { type: Number, default: 0 },
    easySolved: { type: Number, default: 0 },
    mediumAttempts: { type: Number, default: 0 },
    mediumSolved: { type: Number, default: 0 },
    hardAttempts: { type: Number, default: 0 },
    hardSolved: { type: Number, default: 0 },
    avgRuntime: {
      type: Number,
      default: 0,
    },
    totalRuntime: {
      type: Number,
      default: 0,
    },
    avgTimeTaken: {
      type: Number,
      default: 0,
    },
    totalTimeTaken: {
      type: Number,
      default: 0,
    },
    recentAccuracy: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    recentResults: {
      type: [Boolean],
      default: [],
    },
    streakInTopic: {
      type: Number,
      default: 0,
    },
    lastAttemptedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

userTopicStatsSchema.index({ userId: 1, topic: 1 }, { unique: true });
userTopicStatsSchema.index({ userId: 1, accuracy: 1 });
userTopicStatsSchema.index({ userId: 1, totalSolved: -1 });

module.exports = mongoose.model("UserTopicStats", userTopicStatsSchema);
