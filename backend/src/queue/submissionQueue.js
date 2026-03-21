const Queue = require("bull");
const redis = require("../config/redis");

const submissionQueue = new Queue("submission-queue", {
  redis: {
    host: redis.options.host || "127.0.0.1",
    port: Number(redis.options.port || 6379),
    ...(redis.options.password ? { password: redis.options.password } : {}),
    ...(redis.options.db ? { db: redis.options.db } : {}),
  },
});

module.exports = submissionQueue;
