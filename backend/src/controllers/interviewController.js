const asyncHandler = require("../utils/asyncHandler");
const {
  startInterviewSession,
  respondInterviewSession,
  compareInterviewSessionComplexity,
  getInterviewSession,
  getInterviewSessionMessages,
  endInterviewSession,
  saveCodeSnapshot,
  getInterviewHistory,
  getInterviewStats,
} = require("../services/interviewService");

const startInterview = asyncHandler(async (req, res) => {
  const data = await startInterviewSession({
    userId: req.user._id,
    problemId: req.body.problemId,
  });

  res.status(201).json(data);
});

const respondInterview = asyncHandler(async (req, res) => {
  const data = await respondInterviewSession({
    userId: req.user._id,
    sessionId: req.body.sessionId,
    userMessage: req.body.userMessage,
  });

  res.json(data);
});

const compareInterviewComplexity = asyncHandler(async (req, res) => {
  const data = await compareInterviewSessionComplexity({
    userId: req.user._id,
    sessionId: req.body.sessionId,
    userSolution: req.body.userSolution,
  });

  res.json(data);
});

const getInterviewById = asyncHandler(async (req, res) => {
  const data = await getInterviewSession({
    userId: req.user._id,
    sessionId: req.params.sessionId,
    beforeIndex: req.query.beforeIndex,
    limit: req.query.limit,
  });

  res.json(data);
});

const getInterviewMessages = asyncHandler(async (req, res) => {
  const data = await getInterviewSessionMessages({
    userId: req.user._id,
    sessionId: req.params.sessionId,
    beforeIndex: req.query.beforeIndex,
    limit: req.query.limit,
  });

  res.json(data);
});

const endInterview = asyncHandler(async (req, res) => {
  const data = await endInterviewSession({
    userId: req.user._id,
    sessionId: req.body.sessionId,
    status: req.body.status,
  });

  res.json(data);
});

const saveCode = asyncHandler(async (req, res) => {
  const data = await saveCodeSnapshot({
    userId: req.user._id,
    sessionId: req.body.sessionId,
    code: req.body.code,
    language: req.body.language,
  });

  res.json(data);
});

const getHistory = asyncHandler(async (req, res) => {
  const data = await getInterviewHistory({
    userId: req.user._id,
    page: req.query.page,
    limit: req.query.limit,
    status: req.query.status,
    difficulty: req.query.difficulty,
  });

  res.json(data);
});

const getStats = asyncHandler(async (req, res) => {
  const data = await getInterviewStats({ userId: req.user._id });
  res.json(data);
});

module.exports = {
  startInterview,
  respondInterview,
  compareInterviewComplexity,
  getInterviewById,
  getInterviewMessages,
  endInterview,
  saveCode,
  getHistory,
  getStats,
};
