const mongoose = require("mongoose");
const { CONTEST_STATUS } = require("../constants");

const contestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      required: true,
      index: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    problems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Problem",
        required: true,
      },
    ],
    participants: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    status: {
      type: String,
      enum: Object.values(CONTEST_STATUS),
      default: CONTEST_STATUS.UPCOMING,
      index: true,
    },
  },
  { timestamps: true }
);

contestSchema.pre("save", async function () {
  const now = new Date();
  if (now < this.startTime) this.status = CONTEST_STATUS.UPCOMING;
  else if (now > this.endTime) this.status = CONTEST_STATUS.ENDED;
  else this.status = CONTEST_STATUS.RUNNING;
});

module.exports = mongoose.model("Contest", contestSchema);
