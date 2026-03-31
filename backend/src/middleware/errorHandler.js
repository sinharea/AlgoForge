const { ZodError } = require("zod");
const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");
const { nodeEnv } = require("../config/env");

module.exports = (err, req, res, next) => {
  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: err.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
  }

  // Known API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code || "API_ERROR",
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({
      success: false,
      error: {
        code: "DUPLICATE_ERROR",
        message: `A record with this ${field} already exists`,
      },
    });
  }

  // MongoDB validation error
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      path: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Database validation failed",
        details: errors,
      },
    });
  }

  // Log unexpected errors
  logger.error("Unhandled error", {
    path: req.path,
    method: req.method,
    error: err.message,
    stack: err.stack,
  });

  // Don't leak stack traces in production
  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      ...(nodeEnv !== "production" ? { debug: err.message } : {}),
    },
  });
};
