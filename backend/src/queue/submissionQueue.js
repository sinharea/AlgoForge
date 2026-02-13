const Queue = require("bull");

const submissionQueue = new Queue("submission-queue", {
  redis: {
    host: "127.0.0.1",
    port: 6379
  }
});

module.exports = submissionQueue;
