const USER_ROLES = {
  USER: "user",
  ADMIN: "admin",
};

const AUTH_PROVIDER = {
  LOCAL: "local",
  GOOGLE: "google",
  GITHUB: "github",
};

const SUBMISSION_STATUS = {
  QUEUED: "queued",
  JUDGING: "judging",
  COMPLETED: "completed",
  FAILED: "failed",
};

const VERDICTS = {
  ACCEPTED: "Accepted",
  WRONG_ANSWER: "Wrong Answer",
  TIME_LIMIT_EXCEEDED: "Time Limit Exceeded",
  MEMORY_LIMIT_EXCEEDED: "Memory Limit Exceeded",
  RUNTIME_ERROR: "Runtime Error",
  COMPILATION_ERROR: "Compilation Error",
};

const DIFFICULTY = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

const CONTEST_STATUS = {
  UPCOMING: "upcoming",
  RUNNING: "running",
  ENDED: "ended",
};

const SUPPORTED_LANGUAGES = ["cpp", "python", "java", "javascript", "go", "rust", "typescript"];

module.exports = {
  USER_ROLES,
  AUTH_PROVIDER,
  SUBMISSION_STATUS,
  VERDICTS,
  DIFFICULTY,
  CONTEST_STATUS,
  SUPPORTED_LANGUAGES,
};
