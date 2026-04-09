const mongoose = require("mongoose");

const testCaseSchema = new mongoose.Schema(
  {
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
      index: true,
    },
    input: {
      type: String,
      default: "",
    },
    output: {
      type: String,
      default: "",
    },
    isHidden: {
      type: Boolean,
      default: true,
      index: true,
    },
    storageType: {
      type: String,
      enum: ["mongodb", "file"],
      default: "mongodb",
      index: true,
    },
    inputFilePath: {
      type: String,
      trim: true,
      default: "",
    },
    outputFilePath: {
      type: String,
      trim: true,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

testCaseSchema.index({ problemId: 1, isHidden: 1, createdAt: -1 });

testCaseSchema.pre("validate", function () {
  const hasInlineContent = Boolean(this.input || this.output);
  const hasFileContent = Boolean(this.inputFilePath || this.outputFilePath);

  if (!hasInlineContent && !hasFileContent) {
    this.invalidate("input", "Test case must include inline input/output or file paths");
  }

  if (this.storageType === "mongodb" && !this.output) {
    this.invalidate("output", "Output is required for MongoDB test cases");
  }

  if (this.storageType === "file" && !this.outputFilePath) {
    this.invalidate("outputFilePath", "Output file path is required for file test cases");
  }
});

module.exports = mongoose.model("TestCase", testCaseSchema);
