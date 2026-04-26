const asyncHandler = require("../utils/asyncHandler");
const { getRecommendations, getUserDashboardStats, parseModificationHints } = require("../services/recommendationService");

const getMyRecommendations = asyncHandler(async (req, res) => {
  const data = await getRecommendations(req.user._id);
  res.json(data);
});

const getDashboardStats = asyncHandler(async (req, res) => {
  const data = await getUserDashboardStats(req.user._id);
  res.json(data);
});

const modifyRecommendations = asyncHandler(async (req, res) => {
  const { modification } = req.body;
  if (!modification || typeof modification !== "string" || !modification.trim()) {
    return res.status(400).json({ error: "modification text is required" });
  }
  const hints = parseModificationHints(modification.trim());
  const data = await getRecommendations(req.user._id, hints);
  res.json(data);
});

module.exports = {
  getMyRecommendations,
  getDashboardStats,
  modifyRecommendations,
};
