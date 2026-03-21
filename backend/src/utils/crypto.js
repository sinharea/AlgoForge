const crypto = require("crypto");

const generateToken = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");
const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

module.exports = { generateToken, sha256 };
