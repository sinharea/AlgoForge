const express = require("express");
const auth = require("../middleware/auth");
const {
  getWeakness,
  getHeatmap,
  getTopicStats,
  toggleBookmark,
  toggleFavorite,
  getBookmarks,
  getProblemStatuses,
  attemptEfficiency,
  topicProgress,
  accuracyTrend,
  solveSpeed,
  topicErrors,
  topicTrends,
  errorPatterns,
  weaknessComparison,
  milestones,
  insights,
  weaknessDetailed,
} = require("../controllers/userController");

const router = express.Router();

router.get("/weakness", auth, getWeakness);
router.get("/weakness-detailed", auth, weaknessDetailed);
router.get("/heatmap", auth, getHeatmap);
router.get("/topic-stats", auth, getTopicStats);
router.get("/bookmarks", auth, getBookmarks);
router.get("/problem-statuses", auth, getProblemStatuses);
router.post("/problems/:problemId/bookmark", auth, toggleBookmark);
router.post("/problems/:problemId/favorite", auth, toggleFavorite);
router.get("/attempt-efficiency", auth, attemptEfficiency);
router.get("/topic-progress", auth, topicProgress);
router.get("/accuracy-trend", auth, accuracyTrend);
router.get("/solve-speed", auth, solveSpeed);
router.get("/topic-errors", auth, topicErrors);
router.get("/topic-trends", auth, topicTrends);
router.get("/error-patterns", auth, errorPatterns);
router.get("/weakness-comparison", auth, weaknessComparison);
router.get("/milestones", auth, milestones);
router.get("/insights", auth, insights);

module.exports = router;