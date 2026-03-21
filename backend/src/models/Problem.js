const mongoose = require("mongoose");
const { DIFFICULTY } = require("../constants");

const problemSchema = new mongoose.Schema({
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

module.exports = mongoose.model("Problem", problemSchema);
