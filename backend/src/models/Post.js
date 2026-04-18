const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 220,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10000,
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    upvotes: {
      type: Number,
      default: 0,
      index: true,
    },
    downvotes: {
      type: Number,
      default: 0,
    },
    score: {
      type: Number,
      default: 0,
      index: true,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    pinnedCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    acceptedCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
  },
  { timestamps: true }
);

postSchema.index({ problemId: 1, createdAt: -1 });
postSchema.index({ problemId: 1, userId: 1, createdAt: -1 });
postSchema.index({ problemId: 1, score: -1, createdAt: -1 });
postSchema.index({ title: "text", content: "text", tags: "text" });

module.exports = mongoose.model("Post", postSchema);
