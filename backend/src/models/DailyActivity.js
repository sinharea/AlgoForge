const mongoose = require("mongoose");

const dailyActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    submissionCount: {
      type: Number,
      default: 0,
    },
    acceptedCount: {
      type: Number,
      default: 0,
    },
    problemsAttempted: {
      type: Number,
      default: 0,
    },
    problemsSolved: {
      type: Number,
      default: 0,
    },
    topicsPracticed: {
      type: [String],
      default: [],
    },
    contestsParticipated: {
      type: Number,
      default: 0,
    },
    interviewsCompleted: {
      type: Number,
      default: 0,
    },
    activeMinutes: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

dailyActivitySchema.index({ userId: 1, date: -1 }, { unique: true });
dailyActivitySchema.index({ date: -1 });

module.exports = mongoose.model("DailyActivity", dailyActivitySchema);
