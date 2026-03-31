const mongoose = require("mongoose");

const ratingHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  contest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contest",
    required: true,
  },
  oldRating: {
    type: Number,
    required: true,
  },
  newRating: {
    type: Number,
    required: true,
  },
  ratingChange: {
    type: Number,
    required: true,
  },
  rank: {
    type: Number,
    required: true,
  },
  performanceRating: {
    type: Number,
  },
}, { timestamps: true });

ratingHistorySchema.index({ user: 1, createdAt: -1 });
ratingHistorySchema.index({ contest: 1 });

module.exports = mongoose.model("RatingHistory", ratingHistorySchema);
