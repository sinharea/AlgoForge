const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { jwtAccessSecret } = require("../config/env");
const ApiError = require("../utils/apiError");

const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new ApiError(401, "Authorization token missing");
  }

  const token = authHeader.split(" ")[1];
  let payload;
  try {
    payload = jwt.verify(token, jwtAccessSecret);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired token");
  }

  const user = await User.findById(payload.sub).select("-password");
  if (!user) {
    throw new ApiError(401, "User not found");
  }

  req.user = user;
  next();
};

module.exports = auth;
