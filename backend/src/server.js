const app = require("./app");
const connectDb = require("./config/db");
const { port } = require("./config/env");
const mongoose = require("mongoose");

// Global error handlers to prevent crashes from unhandled errors
process.on("unhandledRejection", (reason, promise) => {
  // eslint-disable-next-line no-console
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Don't exit immediately - let the error handler middleware catch it if possible
});

process.on("uncaughtException", (error) => {
  // eslint-disable-next-line no-console
  console.error("Uncaught Exception:", error);
  // For uncaught exceptions, we should exit as the process is in an unknown state
  mongoose.disconnect();
  process.exit(1);
});

const start = async () => {
  await connectDb();

  // Set up mongoose connection event listeners
  mongoose.connection.on("connected", () => {
    // eslint-disable-next-line no-console
    console.log("MongoDB connected successfully");
  });

  mongoose.connection.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("MongoDB connection error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    // eslint-disable-next-line no-console
    console.warn("MongoDB disconnected");
  });

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on port ${port}`);
  });
};

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Startup failed:", error.message);
  process.exit(1);
});
