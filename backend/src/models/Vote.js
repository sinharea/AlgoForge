const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["post", "comment"],
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    voteType: {
      type: Number,
      enum: [1, -1],
      required: true,
    },
  },
  { timestamps: true }
);

voteSchema.index({ targetId: 1 });
voteSchema.index({ targetType: 1, targetId: 1 });
voteSchema.index({ userId: 1, targetId: 1 }, { unique: true });

module.exports = mongoose.model("Vote", voteSchema);
