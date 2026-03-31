const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const getRequired = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
};

const nodeEnv = process.env.NODE_ENV || "development";

module.exports = {
  nodeEnv,
  port: Number(process.env.PORT || 5000),
  queueEnabled: (process.env.QUEUE_ENABLED || "false") === "true",
  redisEnabled: (process.env.REDIS_ENABLED || "false") === "true",
  mongoUri: getRequired("MONGO_URI"),
  jwtAccessSecret: getRequired("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: getRequired("JWT_REFRESH_SECRET"),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  smtpHost: process.env.SMTP_HOST,
  smtpPort: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  smtpUser: process.env.SMTP_USER,
  smtpPass: process.env.SMTP_PASS,
  smtpFrom: process.env.SMTP_FROM || "noreply@algoforge.dev",
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleCallbackUrl:
    process.env.GOOGLE_CALLBACK_URL ||
    "http://localhost:5000/api/auth/oauth/google/callback",
  githubClientId: process.env.GITHUB_CLIENT_ID,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
  githubCallbackUrl:
    process.env.GITHUB_CALLBACK_URL ||
    "http://localhost:5000/api/auth/oauth/github/callback",
  executionEnabled: (process.env.EXECUTION_ENABLED || "true") === "true",
  executionMode: process.env.EXECUTION_MODE || "local",
  codeExecApi: process.env.CODE_EXEC_API || "http://localhost:2358",
  executionApiUrl: process.env.EXECUTION_API_URL || process.env.CODE_EXEC_API,
  executionApiKey: process.env.EXECUTION_API_KEY,
  dockerNetworkDisabled: process.env.DOCKER_NETWORK_DISABLED !== "false",
  dockerCpuLimit: process.env.DOCKER_CPU_LIMIT || "0.5",
  dockerMemoryLimit: process.env.DOCKER_MEMORY_LIMIT || "256m",
  dockerExecutionTimeoutMs: Number(process.env.DOCKER_EXECUTION_TIMEOUT_MS || 5000),
  localExecutionTimeoutMs: Number(process.env.LOCAL_EXECUTION_TIMEOUT_MS || 4000),
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
};
