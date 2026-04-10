const mongoose = require("mongoose");

const interviewMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["interviewer", "user"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 4000,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
      index: true,
    },
    messages: {
      type: [interviewMessageSchema],
      default: [],
    },
    currentStage: {
      type: String,
      enum: ["approach", "complexity", "edge_cases", "optimization", "coding"],
      default: "approach",
      index: true,
    },
    currentState: {
      phase: { type: String, default: "active" },
      hintsGiven: { type: Number, default: 0 },
      stuckCount: { type: Number, default: 0 },
      userStuck: { type: Boolean, default: false },
      turn: { type: Number, default: 0 },
      lastInterviewerQuestion: { type: String, default: "" },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "interview_sessions" }
);

interviewSessionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("InterviewSession", interviewSessionSchema);
