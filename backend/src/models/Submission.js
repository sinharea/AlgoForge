const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  problemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Problem",
    required: true
  },
  language: {
    type: String,
    enum: ["cpp", "python", "java"],
    required: true
  },
  code: {
    type: String,
    required: true
  },
  verdict: {
    type: String,
    enum: [
      "Pending",
      "Accepted",
      "Wrong Answer",
      "TLE",
      "Runtime Error"
    ],
    default: "Pending"
  },
  runtime: Number,
  memory: Number
}, { timestamps: true });

module.exports = mongoose.model("Submission", submissionSchema);
