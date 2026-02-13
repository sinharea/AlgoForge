const mongoose = require("mongoose");

const problemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  difficulty: {
    type: String,
    enum: ["Easy", "Medium", "Hard"],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  constraints: String,
  tags: [String],

  sampleTestCases: [
    {
      input: String,
      expectedOutput: String
    }
  ],

  hiddenTestCases: [
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

module.exports = mongoose.model("Problem", problemSchema);
