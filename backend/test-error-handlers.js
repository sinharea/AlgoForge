#!/usr/bin/env node
/**
 * Test script to verify error handlers are properly configured
 * without actually starting the server
 */

console.log("Testing error handler configuration...\n");

// Test 1: Check that server.js has the error handlers
const fs = require("fs");
const path = require("path");

function checkFileContains(filePath, patterns, testName) {
  const content = fs.readFileSync(path.join(__dirname, filePath), "utf8");
  let passed = true;

  console.log(`\n✓ Testing: ${testName}`);
  patterns.forEach(({ pattern, description }) => {
    if (content.includes(pattern)) {
      console.log(`  ✓ ${description}`);
    } else {
      console.log(`  ✗ MISSING: ${description}`);
      passed = false;
    }
  });

  return passed;
}

let allPassed = true;

// Test server.js
allPassed &= checkFileContains(
  "src/server.js",
  [
    { pattern: 'process.on("unhandledRejection"', description: "Unhandled rejection handler" },
    { pattern: 'process.on("uncaughtException"', description: "Uncaught exception handler" },
    { pattern: 'mongoose.connection.on("connected"', description: "MongoDB connected event" },
    { pattern: 'mongoose.connection.on("error"', description: "MongoDB error event" },
    { pattern: 'mongoose.connection.on("disconnected"', description: "MongoDB disconnected event" },
  ],
  "server.js - Error Handlers"
);

// Test redis.js
allPassed &= checkFileContains(
  "src/config/redis.js",
  [
    { pattern: 'client.on("error"', description: "Redis error handler" },
    { pattern: 'console.error("Redis connection error:', description: "Redis error logging" },
    { pattern: 'client.on("connect"', description: "Redis connect event" },
  ],
  "redis.js - Connection Handlers"
);

// Test db.js
allPassed &= checkFileContains(
  "src/config/db.js",
  [
    { pattern: "try {", description: "Try-catch block" },
    { pattern: 'console.error("MongoDB connection failed:', description: "Error logging" },
    { pattern: "throw error", description: "Error propagation" },
  ],
  "db.js - Error Handling"
);

// Test worker.js
allPassed &= checkFileContains(
  "src/queue/worker.js",
  [
    { pattern: 'process.on("unhandledRejection"', description: "Unhandled rejection handler" },
    { pattern: 'process.on("uncaughtException"', description: "Uncaught exception handler" },
    { pattern: 'submissionQueue.on("error"', description: "Queue error handler" },
    { pattern: "try {", description: "Try-catch in job processor" },
    { pattern: 'logger.error("Error processing submission job"', description: "Job error logging" },
  ],
  "worker.js - Error Handlers"
);

console.log("\n" + "=".repeat(50));
if (allPassed) {
  console.log("✓ All error handler tests PASSED!");
  console.log("\nCritical crash prevention measures are in place:");
  console.log("  - Global unhandled rejection handlers");
  console.log("  - Global uncaught exception handlers");
  console.log("  - Database connection monitoring");
  console.log("  - Redis connection error logging");
  console.log("  - Queue error handling");
  console.log("  - Job processing error recovery");
  process.exit(0);
} else {
  console.log("✗ Some error handler tests FAILED!");
  process.exit(1);
}
