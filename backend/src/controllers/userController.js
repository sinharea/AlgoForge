const asyncHandler = require("../utils/asyncHandler");
const { getWeaknessReport } = require("../services/recommendationService");

const getWeakness = asyncHandler(async (req, res) => {
  const data = await getWeaknessReport(req.user._id);
  res.json(data);
});

module.exports = {
  getWeakness,
};