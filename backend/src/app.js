const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const mongoose = require("mongoose");
const path = require("path");
const { passport } = require("./controllers/oauthController");

const routes = require("./routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimiter");
const { corsOrigin, nodeEnv } = require("./config/env");

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: nodeEnv === "production",
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = corsOrigin.split(",").map(o => o.trim());
    if (allowedOrigins.includes(origin) || (nodeEnv !== "production" && origin.includes("localhost"))) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
app.use(cors(corsOptions));

// Body parsing with size limits
app.use(express.json({ limit: "100kb" })); // Reduced from 1mb to prevent abuse
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Logging
app.use(morgan(nodeEnv === "production" ? "combined" : "dev"));

// Passport for OAuth
app.use(passport.initialize());

// Public uploaded files (avatars)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Health check endpoint (no rate limit)
app.get("/health", (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: nodeEnv,
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  };
  res.json(health);
});

// API routes with general rate limiting
app.use("/api", apiLimiter, routes);

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

module.exports = app;
