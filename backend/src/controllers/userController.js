const asyncHandler = require("../utils/asyncHandler");
const { getWeaknessReport } = require("../services/recommendationService");
const { getHeatmapData, getTopicAnalytics } = require("../services/analyticsService");
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
};