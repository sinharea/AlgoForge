const mongoose = require("mongoose");

const editHistorySchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    editedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
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
    replyCount: {
      type: Number,
      default: 0,
    },
    depth: {
      type: Number,
      default: 0,
      max: 5,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isAccepted: {
      type: Boolean,
      default: false,
    },
    editHistory: {
      type: [editHistorySchema],
      default: [],
    },
    mentions: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

commentSchema.index({ postId: 1, createdAt: 1 });
commentSchema.index({ postId: 1, parentId: 1, createdAt: 1 });
commentSchema.index({ postId: 1, score: -1 });
commentSchema.index({ userId: 1, createdAt: -1 });
commentSchema.index({ content: "text" });

module.exports = mongoose.model("Comment", commentSchema);
