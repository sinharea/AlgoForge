const Contest = require("../models/Contest");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const { buildLeaderboard, registerContestParticipant, getContestState } = require("../services/contestService");

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

module.exports = {
  createContest,
  listContests,
  registerForContest,
  getLeaderboard,
};
