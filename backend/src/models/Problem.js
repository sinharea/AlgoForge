const mongoose = require("mongoose");
const { DIFFICULTY } = require("../constants");

const problemSchema = new mongoose.Schema({
  questionNumber: {
    type: Number,
    min: 1,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  difficulty: {
    type: String,
    enum: Object.values(DIFFICULTY),
    required: true,
    index: true,
  },
  description: {
    type: String,
    required: true,
  },
  constraints: String,
  editorialSolution: {
    type: String,
    default: "",
  },
  optimalComplexity: {
    time: {
      type: String,
      trim: true,
      default: "",
    },
    space: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  tags: [{ type: String, index: true }],

  testCases: [
    {
      input: String,
      expectedOutput: String  
    }
  ],

  sampleTestCases: [
    {
      input: String,
      expectedOutput: String
    }
  ],

  hiddenTestCaseCount: {
    type: Number,
    default: 0,
    min: 0,
  },

  timeLimit: {
    type: Number,
    default: 2000
  },

  memoryLimit: {
    type: Number,
    default: 128
  }

}, { timestamps: true });

problemSchema.index({ title: "text", description: "text", tags: "text" });
problemSchema.index({ questionNumber: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Problem", problemSchema);
