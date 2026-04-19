const asyncHandler = require("../utils/asyncHandler");
const { getWeaknessReport } = require("../services/recommendationService");
const {
  getHeatmapData,
  getTopicAnalytics,
  getAttemptEfficiency,
  getTopicProgress,
  getAccuracyTrend,
  getSolveSpeed,
  getTopicErrors,
  getTopicTrends,
  getErrorPatterns,
  getWeaknessComparison,
  getDynamicMilestones,
  generateInsights,
} = require("../services/analyticsService");
const UserProblemStatus = require("../models/UserProblemStatus");
const ApiError = require("../utils/apiError");

const getWeakness = asyncHandler(async (req, res) => {
  const data = await getWeaknessReport(req.user._id);
  res.json(data);
});

const getHeatmap = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();
  const data = await getHeatmapData(req.user._id, year);
  res.json(data);
});

const getTopicStats = asyncHandler(async (req, res) => {
  const data = await getTopicAnalytics(req.user._id);
  res.json(data);
});

const toggleBookmark = asyncHandler(async (req, res) => {
  const { problemId } = req.params;
  const userId = req.user._id;

  const status = await UserProblemStatus.findOneAndUpdate(
    { userId, problemId },
    { $setOnInsert: { userId, problemId } },
    { upsert: true, new: true }
  );

  status.isBookmarked = !status.isBookmarked;
  await status.save();

  res.json({ isBookmarked: status.isBookmarked });
});

const toggleFavorite = asyncHandler(async (req, res) => {
  const { problemId } = req.params;
  const userId = req.user._id;

  const status = await UserProblemStatus.findOneAndUpdate(
    { userId, problemId },
    { $setOnInsert: { userId, problemId } },
    { upsert: true, new: true }
  );

  status.isFavorited = !status.isFavorited;
  await status.save();

  res.json({ isFavorited: status.isFavorited });
});

const getBookmarks = asyncHandler(async (req, res) => {
  const statuses = await UserProblemStatus.find({
    userId: req.user._id,
    isBookmarked: true,
  })
    .populate("problemId", "title slug difficulty tags")
    .lean();

  res.json(statuses.map((s) => s.problemId).filter(Boolean));
});

const getProblemStatuses = asyncHandler(async (req, res) => {
  const statuses = await UserProblemStatus.find({ userId: req.user._id })
    .select("problemId status isFavorited isBookmarked totalAttempts bestRuntime lastVerdict")
    .lean();

  res.json(statuses);
});

module.exports = {
  getWeakness,
  getHeatmap,
  getTopicStats,
  toggleBookmark,
  toggleFavorite,
  getBookmarks,
  getProblemStatuses,
  attemptEfficiency: asyncHandler(async (req, res) => {
    const { topic, difficulty, range } = req.query;
    const data = await getAttemptEfficiency(req.user._id, { topic, difficulty, range });
    res.json(data);
  }),
  topicProgress: asyncHandler(async (req, res) => {
    const { granularity, months } = req.query;
    const data = await getTopicProgress(req.user._id, {
      granularity: granularity || "weekly",
      months: parseInt(months, 10) || 3,
    });
    res.json(data);
  }),
  accuracyTrend: asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days, 10) || 30;
    const data = await getAccuracyTrend(req.user._id, { days });
    res.json(data);
  }),
  solveSpeed: asyncHandler(async (req, res) => {
    const months = parseInt(req.query.months, 10) || 6;
    const data = await getSolveSpeed(req.user._id, { months });
    res.json(data);
  }),
  topicErrors: asyncHandler(async (req, res) => {
    const { topic } = req.query;
    const data = await getTopicErrors(req.user._id, { topic });
    res.json(data);
  }),
  topicTrends: asyncHandler(async (req, res) => {
    const topics = req.query.topics ? req.query.topics.split(",") : [];
    const weeks = parseInt(req.query.weeks, 10) || 12;
    const data = await getTopicTrends(req.user._id, { topics, weeks });
    res.json(data);
  }),
  errorPatterns: asyncHandler(async (req, res) => {
    const data = await getErrorPatterns(req.user._id);
    res.json(data);
  }),
  weaknessComparison: asyncHandler(async (req, res) => {
    const data = await getWeaknessComparison(req.user._id);
    res.json(data);
  }),
  milestones: asyncHandler(async (req, res) => {
    const data = await getDynamicMilestones(req.user._id);
    res.json(data);
  }),
  insights: asyncHandler(async (req, res) => {
    const data = await generateInsights(req.user._id);
    res.json(data);
  }),
  weaknessDetailed: asyncHandler(async (req, res) => {
    const { getDetailedWeakness } = require("../services/recommendationService");
    const data = await getDetailedWeakness(req.user._id);
    res.json(data);
  }),
};