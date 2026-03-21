const ApiError = require("../utils/apiError");

const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw new ApiError(403, "Forbidden");
  }
  next();
};

module.exports = authorize;
