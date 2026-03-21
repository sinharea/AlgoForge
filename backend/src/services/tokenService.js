const jwt = require("jsonwebtoken");
const ms = require("ms");
const crypto = require("crypto");
const {
  jwtAccessSecret,
  jwtRefreshSecret,
  jwtAccessExpiresIn,
  jwtRefreshExpiresIn,
} = require("../config/env");

const createAccessToken = (user) =>
  jwt.sign(
    { sub: String(user._id), role: user.role, email: user.email },
    jwtAccessSecret,
    { expiresIn: jwtAccessExpiresIn }
  );

const createRefreshToken = (user) =>
  jwt.sign({ sub: String(user._id) }, jwtRefreshSecret, {
    expiresIn: jwtRefreshExpiresIn,
  });

const verifyRefreshToken = (token) => jwt.verify(token, jwtRefreshSecret);

const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getRefreshTokenExpiryDate = () => {
  const milliseconds = typeof jwtRefreshExpiresIn === "string"
    ? ms(jwtRefreshExpiresIn)
    : jwtRefreshExpiresIn * 1000;
  return new Date(Date.now() + milliseconds);
};

module.exports = {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
  getRefreshTokenExpiryDate,
};
