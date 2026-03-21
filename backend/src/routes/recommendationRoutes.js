const express = require("express");
const auth = require("../middleware/auth");
const {
  getMyRecommendations,
  getDashboardStats,
} = require("../controllers/recommendationController");

const router = express.Router();

router.get("/", auth, getMyRecommendations);
router.get("/dashboard", auth, getDashboardStats);

module.exports = router;
