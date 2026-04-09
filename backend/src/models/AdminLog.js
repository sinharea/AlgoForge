const mongoose = require("mongoose");

const adminLogSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    targetType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: false }
);

adminLogSchema.index({ adminId: 1, timestamp: -1 });
adminLogSchema.index({ targetType: 1, timestamp: -1 });

module.exports = mongoose.model("AdminLog", adminLogSchema);
