const mongoose = require("mongoose");
const { SUBMISSION_STATUS } = require("../constants");

const submissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Problem",
    required: true
  },
  language: {
    type: String,
    enum: ["cpp", "python", "java", "javascript"],
    required: true
  },
  code: {
    type: String,
    required: true
  },
  result: {
    stdout: String,
    stderr: String,
    compileOutput: String,
    passedCount: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0 },
  },
  status: {
    type: String,
    enum: Object.values(SUBMISSION_STATUS),
    default: SUBMISSION_STATUS.QUEUED,
  },
  verdict: String,
  runtime: Number,
  memory: Number,
}, { timestamps: true });

submissionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Submission", submissionSchema);
