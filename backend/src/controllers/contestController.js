const Contest = require("../models/Contest");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { buildLeaderboard, registerContestParticipant, getContestState } = require("../services/contestService");
const { processContestRatings, getUserRatingHistory, getRatingLeaderboard } = require("../services/ratingService");

const createContest = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    startTime: new Date(req.body.startTime),
    endTime: new Date(req.body.endTime),
  };
  if (payload.endTime <= payload.startTime) throw new ApiError(400, "Invalid contest timing");
  const contest = await Contest.create(payload);
  res.status(201).json(contest);
});

const listContests = asyncHandler(async (req, res) => {
  const contests = await Contest.find()
    .populate("problems", "title slug difficulty")
    .sort({ startTime: 1 });
  const items = contests.map((contest) => ({
    ...contest.toObject(),
    state: getContestState(contest),
  }));
  res.json(items);
});

const registerForContest = asyncHandler(async (req, res) => {
  const contest = await registerContestParticipant(req.params.id, req.user._id);
  res.json(contest);
});

const getLeaderboard = asyncHandler(async (req, res) => {
  const leaderboard = await buildLeaderboard(req.params.id);
  res.json(leaderboard);
});

// Process ratings for a contest (admin only)
const processRatings = asyncHandler(async (req, res) => {
  const contest = await Contest.findById(req.params.id);
  if (!contest) throw new ApiError(404, "Contest not found");

  const state = getContestState(contest);
  if (state !== "ended") {
    throw new ApiError(400, "Can only process ratings for ended contests");
  }

  if (contest.ratingsProcessed) {
    throw new ApiError(400, "Ratings have already been processed for this contest");
  }

  const ratingChanges = await processContestRatings(req.params.id);
  res.json({
    message: "Ratings processed successfully",
    participantsAffected: ratingChanges.length,
    ratingChanges,
  });
});

// Get user rating history
const getUserRatings = asyncHandler(async (req, res) => {
  const history = await getUserRatingHistory(req.params.userId || req.user._id);
  res.json(history);
});

// Get rating leaderboard
const getRatingsLeaderboard = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50 } = req.query;
  const leaderboard = await getRatingLeaderboard({
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  });
  res.json(leaderboard);
});

module.exports = {
  createContest,
  listContests,
  registerForContest,
  getLeaderboard,
  processRatings,
  getUserRatings,
  getRatingsLeaderboard,
};
