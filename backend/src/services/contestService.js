const mongoose = require("mongoose");
const Contest = require("../models/Contest");
const ContestSubmission = require("../models/ContestSubmission");
const ApiError = require("../utils/apiError");
const redis = require("../config/redis");

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

  await redis.del(`contest:leaderboard:${contestId}`);
};

const buildLeaderboard = async (contestId) => {
  const contestObjectId =
    typeof contestId === "string" ? new mongoose.Types.ObjectId(contestId) : contestId;
  const cacheKey = `contest:leaderboard:${contestId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const leaderboard = await ContestSubmission.aggregate([
    { $match: { contest: contestObjectId } },
    {
      $group: {
        _id: { user: "$user", problem: "$problem" },
        solved: { $max: { $cond: [{ $eq: ["$solved", true] }, 1, 0] } },
        bestPenalty: { $min: "$penaltyMinutes" },
      },
    },
    {
      $group: {
        _id: "$_id.user",
        score: { $sum: "$solved" },
        penalty: { $sum: "$bestPenalty" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    { $unwind: "$user" },
    {
      $project: {
        _id: 0,
        userId: "$user._id",
        name: "$user.name",
        score: 1,
        penalty: 1,
      },
    },
    { $sort: { score: -1, penalty: 1, name: 1 } },
  ]);

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

  return Contest.findById(contestId).populate("problems", "title slug difficulty");
};

module.exports = {
  getContestState,
  ensureContestSubmissionAllowed,
  trackContestSubmission,
  buildLeaderboard,
  registerContestParticipant,
};
