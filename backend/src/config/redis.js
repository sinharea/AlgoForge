const Redis = require("ioredis");
const { redisEnabled, redisUrl } = require("./env");

let client = null;

if (redisEnabled) {
  client = new Redis(redisUrl, { maxRetriesPerRequest: null, lazyConnect: true });
  client.on("error", () => {});
}

const noop = {
  options: { host: "127.0.0.1", port: 6379 },
  get: async () => null,
  set: async () => "OK",
  del: async () => 1,
};

module.exports = client || noop;
