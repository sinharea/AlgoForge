const mongoose = require("mongoose");
const { SUBMISSION_STATUS, VERDICTS } = require("../constants");

const submissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Problem",
    required: true,
    index: true,
  },
  language: {
    type: String,
    enum: ["cpp", "python", "java", "javascript", "go", "rust", "typescript"],
    required: true
  },
  code: {
    type: String,
    required: true,
    maxlength: 65536, // 64KB max code size
  },
  contest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contest",
    index: true,
  },
  result: {
    stdout: { type: String, maxlength: 65536 },
    stderr: { type: String, maxlength: 65536 },
    compileOutput: { type: String, maxlength: 65536 },
    passedCount: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0 },
    failedTestCase: Number,
    expectedOutput: String,
    actualOutput: String,
  },
  status: {
    type: String,
    enum: Object.values(SUBMISSION_STATUS),
    default: SUBMISSION_STATUS.QUEUED,
    index: true,
  },
  verdict: {
    type: String,
    enum: [...Object.values(VERDICTS), null],
  },
  runtime: Number,
  memory: Number,
}, { timestamps: true });

// Composite indexes for common queries
submissionSchema.index({ user: 1, createdAt: -1 });
submissionSchema.index({ user: 1, problem: 1 }); // For "solved" status per user per problem
submissionSchema.index({ problem: 1, verdict: 1 }); // For problem statistics
submissionSchema.index({ contest: 1, user: 1 }); // For contest submissions
submissionSchema.index({ createdAt: -1 }); // For recent submissions list

module.exports = mongoose.model("Submission", submissionSchema);
