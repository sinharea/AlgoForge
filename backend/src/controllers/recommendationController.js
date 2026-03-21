const asyncHandler = require("../utils/asyncHandler");
const { getRecommendations, getUserDashboardStats } = require("../services/recommendationService");

const getMyRecommendations = asyncHandler(async (req, res) => {
  const data = await getRecommendations(req.user._id);
  res.json(data);
});

const getDashboardStats = asyncHandler(async (req, res) => {
  const data = await getUserDashboardStats(req.user._id);
  res.json(data);
});

module.exports = {
  getMyRecommendations,
  getDashboardStats,
};
