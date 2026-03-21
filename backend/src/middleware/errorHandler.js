const { ZodError } = require("zod");
const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");

module.exports = (err, req, res, next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      errors: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  logger.error("Unhandled error", {
    path: req.path,
    method: req.method,
    error: err.message,
  });

  return res.status(500).json({ message: "Internal server error" });
};
