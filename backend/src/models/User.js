const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { USER_ROLES, AUTH_PROVIDER } = require("../constants");

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
  provider: {
    type: String,
    enum: Object.values(AUTH_PROVIDER),
    default: AUTH_PROVIDER.LOCAL,
  },
  oauthId: {
    type: String,
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
}, { timestamps: true });

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password") || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
