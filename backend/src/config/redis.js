const Redis = require("ioredis");
const { redisEnabled, redisUrl } = require("./env");

let client = null;

if (redisEnabled) {
  client = new Redis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });

  // Properly log Redis connection errors instead of silently ignoring them
  client.on("error", (err) => {
    // eslint-disable-next-line no-console
    console.error("Redis connection error:", err.message);
  });

  client.on("connect", () => {
    // eslint-disable-next-line no-console
    console.log("Redis connected successfully");
  });

  client.on("close", () => {
    // eslint-disable-next-line no-console
    console.warn("Redis connection closed");
  });
}

const noop = {
  options: { host: "127.0.0.1", port: 6379 },
  get: async () => null,
  set: async () => "OK",
  del: async () => 1,
};

module.exports = client || noop;
