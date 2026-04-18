const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "reply",
        "mention",
        "upvote",
        "comment",
        "interview_complete",
        "contest_reminder",
        "achievement",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    link: {
      type: String,
      default: "",
    },
    metadata: {
      postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
      commentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment" },
      problemId: { type: mongoose.Schema.Types.ObjectId, ref: "Problem" },
      sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "InterviewSession" },
      fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      fromUserName: { type: String },
    },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
