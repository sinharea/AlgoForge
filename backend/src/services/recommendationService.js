const mongoose = require("mongoose");
const Problem = require("../models/Problem");
const UserTopicAnalytics = require("../models/UserTopicAnalytics");
const Submission = require("../models/Submission");
const redis = require("../config/redis");

const getUserDashboardStats = async (userId) => {
  const solvedProblems = await Submission.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        verdict: "Accepted",
      },
    },
    {
      $group: {
        _id: "$problem",
        latest: { $max: "$createdAt" },
      },
    },
    {
      $lookup: {
        from: "problems",
        localField: "_id",
        foreignField: "_id",
        as: "problem",
      },
    },
    { $unwind: "$problem" },
  ]);

  const difficultyStats = solvedProblems.reduce(
    (acc, row) => {
      acc[row.problem.difficulty] = (acc[row.problem.difficulty] || 0) + 1;
      return acc;
    },
    { Easy: 0, Medium: 0, Hard: 0 }
  );

  const topicStats = solvedProblems.reduce((acc, row) => {
    (row.problem.tags || []).forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {});

  return {
    totalSolved: solvedProblems.length,
    byDifficulty: difficultyStats,
    byTopic: topicStats,
  };
};

const getRecommendations = async (userId) => {
  const cacheKey = `recommendations:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const analytics = await UserTopicAnalytics.findOne({ user: userId });
  const weakTopics = (analytics?.topics || [])
    .filter((t) => t.attempts >= 2)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3)
    .map((t) => t.topic);

  const solvedProblemIds = await Submission.distinct("problem", {
    user: userId,
    verdict: "Accepted",
  });

  const totalSolved = analytics?.totalSolved || 0;
  const targetDifficulty = totalSolved < 10 ? "Easy" : totalSolved < 40 ? "Medium" : "Hard";

  const query = {
    _id: { $nin: solvedProblemIds },
    difficulty: targetDifficulty,
    ...(weakTopics.length ? { tags: { $in: weakTopics } } : {}),
  };

  let suggestions = await Problem.find(query)
    .select("title slug difficulty tags")
    .limit(15);

  if (!suggestions.length) {
    suggestions = await Problem.find({
      _id: { $nin: solvedProblemIds },
    })
      .select("title slug difficulty tags")
      .limit(15);
  }

  const payload = {
    weakTopics,
    targetDifficulty,
    suggestions,
  };

  await redis.set(cacheKey, JSON.stringify(payload), "EX", 60);
  return payload;
};

module.exports = {
  getUserDashboardStats,
  getRecommendations,
};
