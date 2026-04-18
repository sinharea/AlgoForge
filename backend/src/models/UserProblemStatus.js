const mongoose = require("mongoose");

const userProblemStatusSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ["solved", "attempted"],
      default: "attempted",
    },
    isFavorited: {
      type: Boolean,
      default: false,
    },
    isBookmarked: {
      type: Boolean,
      default: false,
    },
    firstAttemptedAt: {
      type: Date,
    },
    firstSolvedAt: {
      type: Date,
    },
    totalAttempts: {
      type: Number,
      default: 0,
    },
    bestRuntime: {
      type: Number,
    },
    bestMemory: {
      type: Number,
    },
    lastSubmittedAt: {
      type: Date,
    },
    lastVerdict: {
      type: String,
    },
    notes: {
      type: String,
      maxlength: 500,
      default: "",
    },
  },
  { timestamps: true }
);

userProblemStatusSchema.index({ userId: 1, problemId: 1 }, { unique: true });
userProblemStatusSchema.index({ userId: 1, status: 1 });
userProblemStatusSchema.index({ userId: 1, isFavorited: 1 });
userProblemStatusSchema.index({ userId: 1, isBookmarked: 1 });

module.exports = mongoose.model("UserProblemStatus", userProblemStatusSchema);
