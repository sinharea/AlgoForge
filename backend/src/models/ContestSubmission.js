const mongoose = require("mongoose");

const contestSubmissionSchema = new mongoose.Schema(
  {
    contest: { type: mongoose.Schema.Types.ObjectId, ref: "Contest", required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    problem: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", required: true },
    submission: { type: mongoose.Schema.Types.ObjectId, ref: "Submission", required: true },
    verdict: { type: String, required: true },
    runtime: { type: Number, default: 0 },
    solved: { type: Boolean, default: false, index: true },
    submittedAt: { type: Date, default: Date.now, index: true },
    penaltyMinutes: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
  },
  { timestamps: true }
);

contestSubmissionSchema.index({ contest: 1, user: 1, problem: 1, submittedAt: 1 });

module.exports = mongoose.model("ContestSubmission", contestSubmissionSchema);
