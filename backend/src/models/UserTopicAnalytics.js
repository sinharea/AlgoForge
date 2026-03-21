const mongoose = require("mongoose");

const topicStatSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    solved: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    avgRuntime: { type: Number, default: 0 },
    totalRuntime: { type: Number, default: 0 },
  },
  { _id: false }
);

const userTopicAnalyticsSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, index: true },
    topics: [topicStatSchema],
    totalAttempts: { type: Number, default: 0 },
    totalSolved: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserTopicAnalytics", userTopicAnalyticsSchema);
