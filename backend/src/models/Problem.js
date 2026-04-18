const mongoose = require("mongoose");
const { DIFFICULTY } = require("../constants");

const hintSchema = new mongoose.Schema(
  {
    level: { type: Number, min: 1, max: 5, required: true },
    content: { type: String, required: true, maxlength: 2000 },
    type: {
      type: String,
      enum: ["approach", "algorithm", "code", "edge_case"],
      default: "approach",
    },
  },
  { _id: false }
);

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
  editorialApproach: {
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
  tags: [{ type: String }],
  companyTags: [{ type: String }],

  hints: {
    type: [hintSchema],
    default: [],
  },

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
  },

  similarProblems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Problem",
  }],

  isPublished: {
    type: Boolean,
    default: false,
    index: true,
  },

  difficultyScore: {
    type: Number,
    min: 1,
    max: 10,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  inputFormat: {
    type: String,
    default: "",
  },

  outputFormat: {
    type: String,
    default: "",
  },

}, { timestamps: true });

problemSchema.index({ title: "text", description: "text", tags: "text" });
problemSchema.index({ questionNumber: 1 }, { unique: true, sparse: true });
problemSchema.index({ companyTags: 1 });
problemSchema.index({ tags: 1, difficulty: 1 });
problemSchema.index({ isPublished: 1, difficulty: 1 });

module.exports = mongoose.model("Problem", problemSchema);
