const ApiError = require("../utils/apiError");

const checkAdminRole = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    throw ApiError.forbidden("Admin access required");
  }

  if (req.user.status === "banned") {
    throw ApiError.forbidden("Banned account cannot access admin APIs");
  }

  next();
};

module.exports = checkAdminRole;
