const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const getRequired = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
};

const toPositiveInt = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
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
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiBaseUrl: process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta/models",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  openaiApiKey: process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY,
  openaiBaseUrl: process.env.OPENAI_BASE_URL || "https://openrouter.ai/api/v1",
  openaiModel: process.env.OPENAI_MODEL || "openai/gpt-oss-120b:free",
  interviewLastNChats: toPositiveInt(process.env.INTERVIEW_LAST_N_CHATS, 10),
  interviewChatPageSize: toPositiveInt(process.env.INTERVIEW_CHAT_PAGE_SIZE, 20),
  dockerNetworkDisabled: process.env.DOCKER_NETWORK_DISABLED !== "false",
  dockerCpuLimit: process.env.DOCKER_CPU_LIMIT || "0.5",
  dockerMemoryLimit: process.env.DOCKER_MEMORY_LIMIT || "256m",
  dockerExecutionTimeoutMs: Number(process.env.DOCKER_EXECUTION_TIMEOUT_MS || 5000),
  localExecutionTimeoutMs: Number(process.env.LOCAL_EXECUTION_TIMEOUT_MS || 4000),
  redisUrl: process.env.REDIS_URL || "redis://127.0.0.1:6379",
  dockerImagePython: process.env.DOCKER_IMAGE_PYTHON || "python:3.12-alpine",
  dockerImageNode: process.env.DOCKER_IMAGE_NODE || "node:20-alpine",
  dockerImageCpp: process.env.DOCKER_IMAGE_CPP || "gcc:13",
  dockerImageJava: process.env.DOCKER_IMAGE_JAVA || "openjdk:17-alpine",
  dockerImageGo: process.env.DOCKER_IMAGE_GO || "golang:1.21-alpine",
  dockerImageRust: process.env.DOCKER_IMAGE_RUST || "rust:1.74-alpine",
  bcryptSaltRounds: toPositiveInt(process.env.BCRYPT_SALT_ROUNDS, 12),
  maxOutputSize: toPositiveInt(process.env.MAX_OUTPUT_SIZE, 65536),
  mlServiceUrl: process.env.ML_SERVICE_URL || "http://localhost:5050",
};
