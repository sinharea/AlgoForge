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

const codeSnapshotSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, maxlength: 10000 },
    language: {
      type: String,
      enum: ["cpp", "python", "javascript", "java", "go", "rust", "typescript"],
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const scoringSchema = new mongoose.Schema(
  {
    totalScore: { type: Number, default: 0, min: 0, max: 100 },
    correctness: { type: Number, default: 0, min: 0, max: 25 },
    optimality: { type: Number, default: 0, min: 0, max: 25 },
    communication: { type: Number, default: 0, min: 0, max: 20 },
    edgeCases: { type: Number, default: 0, min: 0, max: 15 },
    codeQuality: { type: Number, default: 0, min: 0, max: 15 },
    hintsUsedPenalty: { type: Number, default: 0 },
    skipPenalty: { type: Number, default: 0 },
    timePenalty: { type: Number, default: 0 },
    feedback: { type: String, default: "" },
    strengths: [{ type: String }],
    weaknesses: [{ type: String }],
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
    status: {
      type: String,
      enum: ["active", "completed", "abandoned"],
      default: "active",
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
    codeSnapshots: {
      type: [codeSnapshotSchema],
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
      skipCount: { type: Number, default: 0 },
      skipPenalty: { type: Number, default: 0 },
      pendingSkipConfirmation: { type: Boolean, default: false },
      pendingSkipStage: {
        type: String,
        enum: ["", "approach", "complexity", "edge_cases", "optimization", "coding"],
        default: "",
      },
      pendingSkipAskedAtTurn: { type: Number, default: 0 },
      stageMastery: { type: Number, default: 0 },
      userStuck: { type: Boolean, default: false },
      lastComplexityComparedAt: { type: Date, default: null },
      turn: { type: Number, default: 0 },
      lastInterviewerQuestion: { type: String, default: "" },
    },
    scoring: {
      type: scoringSchema,
      default: () => ({}),
    },
    duration: {
      type: Number, // in seconds
      default: 0,
    },
    endedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: { createdAt: true, updatedAt: true }, collection: "interview_sessions" }
);

interviewSessionSchema.index({ userId: 1, createdAt: -1 });
interviewSessionSchema.index({ userId: 1, problemId: 1, createdAt: -1 });
interviewSessionSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model("InterviewSession", interviewSessionSchema);
