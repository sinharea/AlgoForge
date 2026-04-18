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
} = require("../controllers/userController");

const router = express.Router();

router.get("/weakness", auth, getWeakness);
router.get("/heatmap", auth, getHeatmap);
router.get("/topic-stats", auth, getTopicStats);
router.get("/bookmarks", auth, getBookmarks);
router.get("/problem-statuses", auth, getProblemStatuses);
router.post("/problems/:problemId/bookmark", auth, toggleBookmark);
router.post("/problems/:problemId/favorite", auth, toggleFavorite);

module.exports = router;