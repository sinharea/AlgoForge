const asyncHandler = require("../utils/asyncHandler");
const {
  startInterviewSession,
  respondInterviewSession,
  getInterviewSession,
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

const getInterviewById = asyncHandler(async (req, res) => {
  const data = await getInterviewSession({
    userId: req.user._id,
    sessionId: req.params.sessionId,
  });

  res.json(data);
});

module.exports = {
  startInterview,
  respondInterview,
  getInterviewById,
};
