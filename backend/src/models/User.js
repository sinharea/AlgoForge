const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { USER_ROLES, AUTH_PROVIDER } = require("../constants");

// Default starting rating
const DEFAULT_RATING = 1500;

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true,
  },
  password: {
    type: String,
    required: function requiredPassword() {
      return this.provider === AUTH_PROVIDER.LOCAL;
    },
    minlength: 8,
    select: false,
  },
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.USER,
  },
  status: {
    type: String,
    enum: ["active", "banned"],
    default: "active",
    index: true,
  },
  provider: {
    type: String,
    enum: Object.values(AUTH_PROVIDER),
    default: AUTH_PROVIDER.LOCAL,
  },
  oauthId: {
    type: String,
  },
  avatarUrl: {
    type: String,
    trim: true,
    default: "",
  },
  refreshTokenHash: {
    type: String,
    select: false,
  },
  isEmailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationTokenHash: String,
  emailVerificationExpiresAt: Date,
  passwordResetTokenHash: String,
  passwordResetExpiresAt: Date,
  // Rating system fields
  rating: {
    type: Number,
    default: DEFAULT_RATING,
    index: true,
  },
  maxRating: {
    type: Number,
    default: DEFAULT_RATING,
  },
  contestsParticipated: {
    type: Number,
    default: 0,
  },
  reputation: {
    type: Number,
    default: 0,
    index: true,
  },
}, { timestamps: true });

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;
  // Allow controlled scripts to provide an already-hashed bcrypt password.
  if (/^\$2[aby]\$\d{2}\$/.test(this.password)) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
module.exports.DEFAULT_RATING = DEFAULT_RATING;
