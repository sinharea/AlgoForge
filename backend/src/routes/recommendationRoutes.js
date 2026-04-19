const express = require("express");
const auth = require("../middleware/auth");
const {
  getMyRecommendations,
  getDashboardStats,
} = require("../controllers/recommendationController");
const asyncHandler = require("../utils/asyncHandler");
const RecFeedback = require("../models/RecFeedback");

const router = express.Router();

router.get("/", auth, getMyRecommendations);
router.get("/dashboard", auth, getDashboardStats);

router.post(
  "/feedback",
  auth,
  asyncHandler(async (req, res) => {
    const { problemId, event } = req.body;
    if (!problemId || !event) return res.status(400).json({ error: "problemId and event required" });

    const validEvents = ["impression", "click", "attempt", "solve", "skip"];
    if (!validEvents.includes(event)) return res.status(400).json({ error: "Invalid event" });

    const eventFieldMap = {
      impression: "impressionAt",
      click: "clickedAt",
      attempt: "attemptedAt",
      solve: "solvedAt",
      skip: "skippedAt",
    };

    await RecFeedback.findOneAndUpdate(
      { userId: req.user._id, problemId, modelVersion: "v1-heuristic" },
      {
        $setOnInsert: { userId: req.user._id, problemId, modelVersion: "v1-heuristic" },
        $set: { [eventFieldMap[event]]: new Date() },
        ...(event === "attempt" ? { $inc: { attemptCount: 1 } } : {}),
        ...(event === "solve" ? { $set: { outcome: 1.0, [eventFieldMap[event]]: new Date() } } : {}),
      },
      { upsert: true }
    );

    res.json({ ok: true });
  })
);

module.exports = router;
