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
    // Rating system fields
    isRated: {
      type: Boolean,
      default: true,
    },
    ratingsProcessed: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rules: {
      type: String,
      default: "",
    },
    scoringType: {
      type: String,
      enum: ["ICPC", "IOI", "CUSTOM"],
      default: "ICPC",
    },
    maxParticipants: {
      type: Number,
    },
    registeredCount: {
      type: Number,
      default: 0,
    },
    tags: [{ type: String, trim: true, lowercase: true }],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual to get real-time state based on current time
contestSchema.virtual("state").get(function () {
  const now = new Date();
  if (now < this.startTime) return CONTEST_STATUS.UPCOMING;
  if (now > this.endTime) return CONTEST_STATUS.ENDED;
  return CONTEST_STATUS.RUNNING;
});

contestSchema.pre("save", async function () {
  const now = new Date();
  if (now < this.startTime) this.status = CONTEST_STATUS.UPCOMING;
  else if (now > this.endTime) this.status = CONTEST_STATUS.ENDED;
  else this.status = CONTEST_STATUS.RUNNING;
});

// Index for finding contests that need rating processing
contestSchema.index({ status: 1, ratingsProcessed: 1 });

module.exports = mongoose.model("Contest", contestSchema);
