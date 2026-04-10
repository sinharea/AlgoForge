const mongoose = require("mongoose");

const topicStatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    correct: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Stored as ratio in range [0, 1].
    accuracy: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
  },
  {
    collection: "topic_stats",
    timestamps: { createdAt: false, updatedAt: true },
  }
);

topicStatSchema.index({ userId: 1, topic: 1 }, { unique: true });

module.exports = mongoose.model("TopicStat", topicStatSchema);