const mongoose = require("mongoose");
const Problem = require("../models/Problem");
const UserTopicAnalytics = require("../models/UserTopicAnalytics");
const TopicStat = require("../models/TopicStat");
const Submission = require("../models/Submission");
const redis = require("../config/redis");

const formatTopicRows = (rows = []) =>
  rows.map((row) => ({
    topic: row.topic,
    accuracy: Number(row.accuracy || 0),
    attempts: row.attempts,
    correct: row.correct,
  }));

const buildImprovementStrategy = ({ weakTopics, strongTopics, recommendationCount }) => {
  if (!weakTopics.length) {
    return "You need more submissions before the system can identify weaknesses. Solve mixed-tag Easy problems first, then revisit this report for personalized guidance.";
  }

  const primaryWeak = weakTopics.slice(0, 2).map((topic) => topic.topic).join(" and ");
  const strong = strongTopics.slice(0, 2).map((topic) => topic.topic).join(", ");

  const warmupLine = `Spend the next 7 days focusing on ${primaryWeak}.`;
  const drillLine = "For each topic, solve 2 Easy + 2 Medium problems daily and write a short post-solve note for mistakes.";
  const reviewLine =
    recommendationCount > 0
      ? `You have ${recommendationCount} tailored unsolved problems below; complete them in order of difficulty.`
      : "No tailored unsolved problems are available right now, so attempt fresh tagged problems from the problem list.";
  const strengthLine = strong
    ? `Keep momentum on your strong areas (${strong}) with one maintenance problem every two days.`
    : "Once your weakest topics cross 70% accuracy, begin balanced practice across all major tags.";

  return `${warmupLine} ${drillLine} ${reviewLine} ${strengthLine}`;
};

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

const getWeaknessReport = async (userId) => {
  const stats = await TopicStat.find({ userId }).sort({ accuracy: 1, attempts: -1 }).lean();
  const normalizedStats = formatTopicRows(stats).filter((row) => row.attempts > 0);

  if (!normalizedStats.length) {
    return {
      weak_topics: [],
      strong_topics: [],
      recommended_problems: [],
      strategy:
        "No data yet. Start solving tagged problems and this report will automatically show your weak areas and recommendations.",
    };
  }

  const weakTopics = normalizedStats
    .filter((row) => row.attempts >= 2)
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
    .slice(0, 5);

  const fallbackWeak = !weakTopics.length
    ? normalizedStats.slice(0, Math.min(3, normalizedStats.length))
    : weakTopics;

  const strongTopics = normalizedStats
    .filter((row) => row.attempts >= 2 && row.accuracy >= 0.7)
    .sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts)
    .slice(0, 5);

  const weakTopicNames = fallbackWeak.map((row) => row.topic);

  const solvedProblemIds = await Submission.distinct("problem", {
    user: userId,
    verdict: "Accepted",
  });

  let recommendedProblems = [];

  if (weakTopicNames.length) {
    recommendedProblems = await Problem.find({
      _id: { $nin: solvedProblemIds },
      tags: { $in: weakTopicNames },
    })
      .select("title slug difficulty tags")
      .limit(10)
      .lean();
  }

  if (recommendedProblems.length < 5) {
    const existingIds = recommendedProblems.map((problem) => problem._id);
    const fallbackProblems = await Problem.find({
      _id: { $nin: [...solvedProblemIds, ...existingIds] },
    })
      .select("title slug difficulty tags")
      .limit(10 - recommendedProblems.length)
      .lean();

    recommendedProblems = [...recommendedProblems, ...fallbackProblems];
  }

  recommendedProblems = recommendedProblems.slice(0, 10);

  return {
    weak_topics: fallbackWeak.map(({ topic, accuracy, attempts }) => ({ topic, accuracy, attempts })),
    strong_topics: strongTopics.map(({ topic, accuracy, attempts }) => ({ topic, accuracy, attempts })),
    recommended_problems: recommendedProblems.map((problem) => ({
      id: problem._id,
      title: problem.title,
      slug: problem.slug,
      difficulty: problem.difficulty,
      tags: problem.tags || [],
    })),
    strategy: buildImprovementStrategy({
      weakTopics: fallbackWeak,
      strongTopics,
      recommendationCount: recommendedProblems.length,
    }),
  };
};

module.exports = {
  getUserDashboardStats,
  getRecommendations,
  getWeaknessReport,
};
