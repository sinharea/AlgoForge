const mongoose = require("mongoose");
const Contest = require("../models/Contest");
const ContestSubmission = require("../models/ContestSubmission");
const { DIFFICULTY } = require("../constants");
const ApiError = require("../utils/apiError");
const redis = require("../config/redis");

const getProblemPoints = (problemOrDifficulty) => {
  const difficulty =
    typeof problemOrDifficulty === "string"
      ? problemOrDifficulty
      : problemOrDifficulty?.difficulty;

  if (difficulty === DIFFICULTY.HARD) return 300;
  if (difficulty === DIFFICULTY.MEDIUM) return 200;
  return 100;
};

const getContestState = (contest) => {
  const now = Date.now();
  const start = new Date(contest.startTime).getTime();
  const end = new Date(contest.endTime).getTime();
  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "running";
};

const ensureContestSubmissionAllowed = async ({ contestId, userId, problemId }) => {
  const contest = await Contest.findById(contestId);
  if (!contest) throw new ApiError(404, "Contest not found");
  const state = getContestState(contest);
  if (state !== "running") throw new ApiError(403, "Contest is not running");
  if (!contest.problems.some((id) => String(id) === String(problemId))) {
    throw new ApiError(400, "Problem is not part of this contest");
  }
  if (!contest.participants.some((entry) => String(entry.user) === String(userId))) {
    throw new ApiError(403, "Not registered for contest");
  }
  return contest;
};

const trackContestSubmission = async ({ contestId, userId, problemId, submissionId, verdict, runtime }) => {
  const contest = await Contest.findById(contestId);
  const firstAccepted = await ContestSubmission.findOne({
    contest: contestId,
    user: userId,
    problem: problemId,
    solved: true,
  });

  let penaltyMinutes = 0;
  if (!firstAccepted && verdict === "Accepted") {
    const wrongAttempts = await ContestSubmission.countDocuments({
      contest: contestId,
      user: userId,
      problem: problemId,
      solved: false,
    });
    penaltyMinutes = wrongAttempts * 20;
    const elapsed = Math.max(
      0,
      Math.floor((new Date() - new Date(contest.startTime)) / (1000 * 60))
    );
    penaltyMinutes += elapsed;
  }

  await ContestSubmission.create({
    contest: contestId,
    user: userId,
    problem: problemId,
    submission: submissionId,
    verdict,
    runtime,
    solved: verdict === "Accepted",
    penaltyMinutes,
  });

  await redis.del(`contest:leaderboard:${String(contestId)}`);
};

const buildLeaderboard = async (contestId) => {
  const contestIdString = String(contestId);
  const contestObjectId =
    typeof contestId === "string" ? new mongoose.Types.ObjectId(contestId) : contestId;
  const cacheKey = `contest:leaderboard:${contestIdString}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const solvedByProblem = await ContestSubmission.aggregate([
    { $match: { contest: contestObjectId } },
    {
      $group: {
        _id: { user: "$user", problem: "$problem" },
        solved: { $max: { $cond: [{ $eq: ["$solved", true] }, 1, 0] } },
        bestPenalty: { $min: "$penaltyMinutes" },
      },
    },
    {
      $project: {
        _id: 0,
        userId: "$_id.user",
        problemId: "$_id.problem",
        solved: 1,
        bestPenalty: 1,
      },
    },
  ]);

  const contest = await Contest.findById(contestObjectId)
    .populate("participants.user", "name")
    .populate("problems", "difficulty")
    .select("participants problems");

  if (!contest) {
    throw new ApiError(404, "Contest not found");
  }

  const pointsByProblemId = new Map(
    (contest.problems || []).map((problem) => [String(problem._id), getProblemPoints(problem)])
  );

  const statsByUserId = new Map();

  solvedByProblem.forEach((row) => {
    const userId = String(row.userId);
    const existing = statsByUserId.get(userId) || {
      score: 0,
      solved: 0,
      penalty: 0,
    };

    if (row.solved) {
      existing.solved += 1;
      existing.score += pointsByProblemId.get(String(row.problemId)) || 0;
      existing.penalty += row.bestPenalty || 0;
    }

    statsByUserId.set(userId, existing);
  });

  const leaderboard = contest.participants
    .filter((entry) => entry?.user)
    .map((entry) => {
      const userId = entry.user._id ? String(entry.user._id) : String(entry.user);
      const scoreData = statsByUserId.get(userId) || { score: 0, solved: 0, penalty: 0 };

      return {
        userId,
        name: entry.user.name || "Unknown",
        score: scoreData.score,
        solved: scoreData.solved,
        penalty: scoreData.penalty,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.solved - a.solved ||
        a.penalty - b.penalty ||
        a.name.localeCompare(b.name)
    );

  await redis.set(cacheKey, JSON.stringify(leaderboard), "EX", 20);
  return leaderboard;
};

const registerContestParticipant = async (contestId, userId) => {
  const contest = await Contest.findById(contestId);
  if (!contest) throw new ApiError(404, "Contest not found");
  if (getContestState(contest) === "ended") throw new ApiError(400, "Contest ended");

  await Contest.updateOne(
    { _id: contestId, "participants.user": { $ne: userId } },
    { $push: { participants: { user: userId } } }
  );

  await redis.del(`contest:leaderboard:${String(contestId)}`);

  return Contest.findById(contestId).populate("problems", "title slug difficulty");
};

module.exports = {
  getContestState,
  getProblemPoints,
  ensureContestSubmissionAllowed,
  trackContestSubmission,
  buildLeaderboard,
  registerContestParticipant,
};
