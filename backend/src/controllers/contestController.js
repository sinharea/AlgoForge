const Contest = require("../models/Contest");
const ContestSubmission = require("../models/ContestSubmission");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");
const {
  buildLeaderboard,
  registerContestParticipant,
  getContestState,
  getProblemPoints,
} = require("../services/contestService");
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

const updateContest = asyncHandler(async (req, res) => {
  const contest = await Contest.findById(req.params.id);
  if (!contest) throw new ApiError(404, "Contest not found");

  const nextStartTime = req.body.startTime ? new Date(req.body.startTime) : contest.startTime;
  const nextEndTime = req.body.endTime ? new Date(req.body.endTime) : contest.endTime;

  if (nextEndTime <= nextStartTime) {
    throw new ApiError(400, "Invalid contest timing");
  }

  if (req.body.title !== undefined) contest.title = req.body.title;
  if (req.body.description !== undefined) contest.description = req.body.description;
  if (req.body.startTime !== undefined) contest.startTime = nextStartTime;
  if (req.body.endTime !== undefined) contest.endTime = nextEndTime;
  if (req.body.duration !== undefined) contest.duration = req.body.duration;
  if (req.body.problems !== undefined) contest.problems = req.body.problems;

  await contest.save();

  const updatedContest = await Contest.findById(contest._id).populate(
    "problems",
    "title slug difficulty questionNumber"
  );

  res.json(updatedContest);
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

const getContestById = asyncHandler(async (req, res) => {
  const contest = await Contest.findById(req.params.id)
    .populate("problems", "title slug difficulty questionNumber")
    .populate("participants.user", "name");

  if (!contest) throw new ApiError(404, "Contest not found");

  const leaderboard = await buildLeaderboard(contest._id);
  const myUserId = String(req.user._id);
  const isRegistered = contest.participants.some((entry) => {
    if (!entry.user) return false;
    if (entry.user._id) return String(entry.user._id) === myUserId;
    return String(entry.user) === myUserId;
  });

  const mySubmissions = await ContestSubmission.find({
    contest: contest._id,
    user: req.user._id,
  }).select("problem solved verdict submittedAt");

  const myProblemStats = new Map();

  mySubmissions.forEach((submission) => {
    const problemId = String(submission.problem);
    const existing = myProblemStats.get(problemId) || {
      problemId,
      attempts: 0,
      solved: false,
      lastVerdict: null,
      lastSubmittedAt: null,
    };

    existing.attempts += 1;
    existing.solved = existing.solved || Boolean(submission.solved);
    existing.lastVerdict = submission.verdict || existing.lastVerdict;

    if (!existing.lastSubmittedAt || submission.submittedAt > existing.lastSubmittedAt) {
      existing.lastSubmittedAt = submission.submittedAt;
    }

    myProblemStats.set(problemId, existing);
  });

  const solvedCount = Array.from(myProblemStats.values()).filter((item) => item.solved).length;
  const attemptedCount = myProblemStats.size;
  const totalSubmissions = mySubmissions.length;
  const rankIndex = leaderboard.findIndex((entry) => String(entry.userId) === myUserId);
  const myLeaderboardEntry = rankIndex >= 0 ? leaderboard[rankIndex] : null;

  const problems = contest.problems.map((problem) => {
    const stat = myProblemStats.get(String(problem._id));
    return {
      _id: problem._id,
      title: problem.title,
      slug: problem.slug,
      difficulty: problem.difficulty,
      questionNumber: problem.questionNumber,
      points: getProblemPoints(problem),
      myStats: {
        attempts: stat?.attempts || 0,
        solved: stat?.solved || false,
        lastVerdict: stat?.lastVerdict || null,
        lastSubmittedAt: stat?.lastSubmittedAt || null,
      },
    };
  }).sort(
    (a, b) =>
      a.points - b.points ||
      (a.questionNumber || Number.MAX_SAFE_INTEGER) -
        (b.questionNumber || Number.MAX_SAFE_INTEGER) ||
      a.title.localeCompare(b.title)
  );

  res.json({
    contest: {
      _id: contest._id,
      title: contest.title,
      description: contest.description,
      startTime: contest.startTime,
      endTime: contest.endTime,
      duration: contest.duration,
      state: getContestState(contest),
      problems,
      participantsCount: contest.participants.length,
    },
    me: {
      isRegistered,
      points: myLeaderboardEntry?.score || 0,
      solvedCount,
      attemptedCount,
      totalSubmissions,
      currentRank: rankIndex >= 0 ? rankIndex + 1 : null,
      totalParticipants: contest.participants.length,
    },
    leaderboard,
  });
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
  updateContest,
  listContests,
  getContestById,
  registerForContest,
  getLeaderboard,
  processRatings,
  getUserRatings,
  getRatingsLeaderboard,
};
