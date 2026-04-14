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

const complexitySnapshotSchema = new mongoose.Schema(
  {
    userSolution: {
      type: String,
      default: "",
      maxlength: 8000,
      trim: true,
    },
    userComplexity: {
      time: { type: String, default: "Unknown" },
      space: { type: String, default: "Unknown" },
      confidence: { type: Number, min: 0, max: 1, default: 0 },
      rationale: { type: String, default: "" },
    },
    optimalComplexity: {
      time: { type: String, default: "Unknown" },
      space: { type: String, default: "Unknown" },
      source: {
        type: String,
        enum: ["problem_data", "ai_generated"],
        default: "ai_generated",
      },
      rationale: { type: String, default: "" },
    },
    comparison: {
      verdict: {
        type: String,
        enum: ["better", "equal", "worse", "unknown"],
        default: "unknown",
      },
      summary: { type: String, default: "" },
      recommendation: { type: String, default: "" },
    },
    createdAt: {
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
    complexityComparisons: {
      type: [complexitySnapshotSchema],
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
      struggleCount: { type: Number, default: 0 },
      stageMastery: { type: Number, default: 0 },
      userStuck: { type: Boolean, default: false },
      lastComplexityComparedAt: { type: Date, default: null },
      turn: { type: Number, default: 0 },
      lastInterviewerQuestion: { type: String, default: "" },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "interview_sessions" }
);

interviewSessionSchema.index({ userId: 1, createdAt: -1 });
interviewSessionSchema.index({ userId: 1, problemId: 1, createdAt: -1 });

module.exports = mongoose.model("InterviewSession", interviewSessionSchema);
