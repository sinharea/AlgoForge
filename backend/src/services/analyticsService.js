const mongoose = require("mongoose");
const UserTopicStats = require("../models/UserTopicStats");
const ProblemStats = require("../models/ProblemStats");
const UserProblemStatus = require("../models/UserProblemStatus");
const DailyActivity = require("../models/DailyActivity");
const User = require("../models/User");
const Submission = require("../models/Submission");

const MAX_RECENT_RESULTS = 20;

const normalizeTags = (tags = []) =>
  [...new Set(tags.map((tag) => String(tag || "").trim()).filter(Boolean))];

const getStartOfDayUTC = (date = new Date()) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/**
 * Update per-topic stats for a user after each submission.
 * Replaces both old updateUserTopicAnalytics and updateUserTopicStats.
 */
const updateUserTopicStats = async ({ userId, tags = [], difficulty, solved, runtime = 0, timeTaken = 0 }) => {
  const normalizedTags = normalizeTags(tags);
  if (!normalizedTags.length) return [];

  const diffKey = difficulty || "";
  const updates = [];

  for (const topic of normalizedTags) {
    const stat = await UserTopicStats.findOneAndUpdate(
      { userId, topic },
      {
        $setOnInsert: { userId, topic },
        $inc: {
          totalAttempts: 1,
          totalSolved: solved ? 1 : 0,
          totalRuntime: runtime,
          totalTimeTaken: timeTaken,
          ...(diffKey === "Easy" ? { easyAttempts: 1, easySolved: solved ? 1 : 0 } : {}),
          ...(diffKey === "Medium" ? { mediumAttempts: 1, mediumSolved: solved ? 1 : 0 } : {}),
          ...(diffKey === "Hard" ? { hardAttempts: 1, hardSolved: solved ? 1 : 0 } : {}),
        },
        $set: { lastAttemptedAt: new Date() },
      },
      { upsert: true, new: true }
    );

    // Recompute derived fields
    stat.accuracy = stat.totalAttempts ? Number(((stat.totalSolved / stat.totalAttempts) * 100).toFixed(2)) : 0;
    stat.avgRuntime = stat.totalAttempts ? Number((stat.totalRuntime / stat.totalAttempts).toFixed(2)) : 0;
    stat.avgTimeTaken = stat.totalAttempts ? Number((stat.totalTimeTaken / stat.totalAttempts).toFixed(2)) : 0;

    // Track recent results for ML trend (sliding window of last 20)
    stat.recentResults.push(!!solved);
    if (stat.recentResults.length > MAX_RECENT_RESULTS) {
      stat.recentResults = stat.recentResults.slice(-MAX_RECENT_RESULTS);
    }
    const recentCorrect = stat.recentResults.filter(Boolean).length;
    stat.recentAccuracy = stat.recentResults.length
      ? Number(((recentCorrect / stat.recentResults.length) * 100).toFixed(2))
      : 0;

    // Streak tracking
    if (solved) {
      stat.streakInTopic += 1;
    } else {
      stat.streakInTopic = 0;
    }

    await stat.save();
    updates.push(stat);
  }

  return updates;
};

/**
 * Update ProblemStats counters after each submission.
 */
const updateProblemStats = async ({ problemId, language, verdict, runtime = 0, memory = 0, isFirstAccepted = false }) => {
  const solved = verdict === "Accepted";

  const stats = await ProblemStats.findOneAndUpdate(
    { problemId },
    {
      $setOnInsert: { problemId },
      $inc: {
        totalSubmissions: 1,
        acceptedSubmissions: solved ? 1 : 0,
        totalAttemptedUsers: isFirstAccepted ? 0 : 0, // handled separately
        totalSolvedUsers: isFirstAccepted ? 1 : 0,
      },
      $set: { lastSubmittedAt: new Date() },
    },
    { upsert: true, new: true }
  );

  // Update acceptance rate
  stats.acceptanceRate = stats.totalSubmissions
    ? Number(((stats.acceptedSubmissions / stats.totalSubmissions) * 100).toFixed(2))
    : 0;

  // Update language breakdown
  const currentCount = stats.languageBreakdown.get(language) || 0;
  stats.languageBreakdown.set(language, currentCount + 1);

  // Running average for runtime and memory (only accepted submissions)
  if (solved && runtime > 0) {
    const acceptedCount = stats.acceptedSubmissions;
    stats.avgRuntime = acceptedCount > 1
      ? Number((((stats.avgRuntime * (acceptedCount - 1)) + runtime) / acceptedCount).toFixed(2))
      : runtime;
  }
  if (solved && memory > 0) {
    const acceptedCount = stats.acceptedSubmissions;
    stats.avgMemory = acceptedCount > 1
      ? Number((((stats.avgMemory * (acceptedCount - 1)) + memory) / acceptedCount).toFixed(2))
      : memory;
  }

  await stats.save();
  return stats;
};

/**
 * Update UserProblemStatus after each submission.
 */
const updateUserProblemStatus = async ({ userId, problemId, verdict, runtime, memory }) => {
  const solved = verdict === "Accepted";
  const now = new Date();

  const existing = await UserProblemStatus.findOne({ userId, problemId });

  if (!existing) {
    const status = await UserProblemStatus.create({
      userId,
      problemId,
      status: solved ? "solved" : "attempted",
      firstAttemptedAt: now,
      firstSolvedAt: solved ? now : undefined,
      totalAttempts: 1,
      bestRuntime: solved && runtime ? runtime : undefined,
      bestMemory: solved && memory ? memory : undefined,
      lastSubmittedAt: now,
      lastVerdict: verdict,
    });
    return { status, isFirstAttempt: true, isFirstAccepted: solved };
  }

  const wasAlreadySolved = existing.status === "solved";
  existing.totalAttempts += 1;
  existing.lastSubmittedAt = now;
  existing.lastVerdict = verdict;

  if (solved) {
    existing.status = "solved";
    if (!existing.firstSolvedAt) existing.firstSolvedAt = now;
    if (runtime && (!existing.bestRuntime || runtime < existing.bestRuntime)) {
      existing.bestRuntime = runtime;
    }
    if (memory && (!existing.bestMemory || memory < existing.bestMemory)) {
      existing.bestMemory = memory;
    }
  }

  await existing.save();
  return { status: existing, isFirstAttempt: false, isFirstAccepted: solved && !wasAlreadySolved };
};

/**
 * Update DailyActivity for heatmap and streak tracking.
 */
const updateDailyActivity = async ({ userId, solved, tags = [], isNewProblemAttempt = false, isNewProblemSolved = false }) => {
  const today = getStartOfDayUTC();

  const activity = await DailyActivity.findOneAndUpdate(
    { userId, date: today },
    {
      $setOnInsert: { userId, date: today },
      $inc: {
        submissionCount: 1,
        acceptedCount: solved ? 1 : 0,
        problemsAttempted: isNewProblemAttempt ? 1 : 0,
        problemsSolved: isNewProblemSolved ? 1 : 0,
      },
      $addToSet: tags.length ? { topicsPracticed: { $each: tags } } : {},
    },
    { upsert: true, new: true }
  );

  return activity;
};

/**
 * Update User denormalized counters and streak.
 */
const updateUserCounters = async ({ userId, solved, difficulty, isFirstAccepted = false }) => {
  const today = getStartOfDayUTC();
  const incFields = { totalSubmissions: 1 };

  if (isFirstAccepted) {
    incFields.totalSolved = 1;
    if (difficulty === "Easy") incFields.easyCount = 1;
    if (difficulty === "Medium") incFields.mediumCount = 1;
    if (difficulty === "Hard") incFields.hardCount = 1;
  }

  const user = await User.findById(userId).select("lastActiveDate currentStreak maxStreak");
  if (!user) return;

  const updates = { $inc: incFields };

  if (solved) {
    const lastActive = user.lastActiveDate ? getStartOfDayUTC(user.lastActiveDate) : null;
    const yesterday = new Date(today);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    let newStreak = user.currentStreak || 0;

    if (lastActive && lastActive.getTime() === yesterday.getTime()) {
      // Consecutive day
      newStreak += 1;
    } else if (!lastActive || lastActive.getTime() < yesterday.getTime()) {
      // Streak broken or first activity
      newStreak = 1;
    }
    // Same day — no streak change

    if (lastActive?.getTime() !== today.getTime()) {
      updates.$set = {
        lastActiveDate: today,
        currentStreak: newStreak,
        maxStreak: Math.max(newStreak, user.maxStreak || 0),
      };
    }
  }

  await User.findByIdAndUpdate(userId, updates);
};

/**
 * Get heatmap data (daily activity) for a user within a date range.
 */
const getHeatmapData = async (userId, year) => {
  const startDate = new Date(Date.UTC(year, 0, 1));
  const endDate = new Date(Date.UTC(year + 1, 0, 1));

  const activities = await DailyActivity.find({
    userId,
    date: { $gte: startDate, $lt: endDate },
  })
    .select("date submissionCount acceptedCount problemsSolved")
    .sort({ date: 1 })
    .lean();

  return activities;
};

/**
 * Get per-topic analytics for a user.
 */
const getTopicAnalytics = async (userId) => {
  const stats = await UserTopicStats.find({ userId })
    .sort({ totalAttempts: -1 })
    .lean();

  return stats;
};

/**
 * Full post-submission analytics pipeline.
 * Called after each submission is judged.
 */
const runPostSubmissionPipeline = async ({
  userId,
  problemId,
  tags = [],
  difficulty,
  verdict,
  language,
  runtime = 0,
  memory = 0,
  timeTaken = 0,
}) => {
  const solved = verdict === "Accepted";

  // 1. Update UserProblemStatus
  const { isFirstAttempt, isFirstAccepted } = await updateUserProblemStatus({
    userId,
    problemId,
    verdict,
    runtime,
    memory,
  });

  // 2. Update ProblemStats
  await updateProblemStats({
    problemId,
    language,
    verdict,
    runtime,
    memory,
    isFirstAccepted,
  });

  // 3. Update UserTopicStats
  await updateUserTopicStats({
    userId,
    tags,
    difficulty,
    solved,
    runtime,
    timeTaken,
  });

  // 4. Update DailyActivity
  await updateDailyActivity({
    userId,
    solved,
    tags,
    isNewProblemAttempt: isFirstAttempt,
    isNewProblemSolved: isFirstAccepted,
  });

  // 5. Update User denormalized counters + streak
  await updateUserCounters({
    userId,
    solved,
    difficulty,
    isFirstAccepted,
  });

  return { isFirstAccepted };
};

/**
 * Get attempt efficiency data for solved problems.
 * Returns efficiency score per problem using exponential decay.
 */
const getAttemptEfficiency = async (userId, { topic, difficulty, range } = {}) => {
  const match = { user: new mongoose.Types.ObjectId(userId), verdict: "Accepted" };
  if (range) {
    const now = new Date();
    const rangeMap = { week: 7, month: 30, quarter: 90 };
    const days = rangeMap[range] || 30;
    match.createdAt = { $gte: new Date(now - days * 86400000) };
  }

  const results = await Submission.aggregate([
    { $match: match },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: "$problem",
        firstAccepted: { $first: "$$ROOT" },
      },
    },
    { $replaceRoot: { newRoot: "$firstAccepted" } },
    { $lookup: { from: "problems", localField: "problem", foreignField: "_id", as: "prob" } },
    { $unwind: "$prob" },
    ...(topic
      ? [
          {
            $match: {
              $or: [{ topicTags: topic }, { "prob.tags": topic }],
            },
          },
        ]
      : []),
    ...(difficulty
      ? [
          {
            $match: {
              $or: [{ difficulty }, { "prob.difficulty": difficulty }],
            },
          },
        ]
      : []),
    {
      $project: {
        title: "$prob.title",
        slug: "$prob.slug",
        difficulty: { $ifNull: ["$difficulty", "$prob.difficulty"] },
        attempts: { $ifNull: ["$attemptNumber", 1] },
        efficiency: {
          $exp: {
            $multiply: [-0.5, { $subtract: [{ $ifNull: ["$attemptNumber", 1] }, 1] }],
          },
        },
        createdAt: 1,
      },
    },
    { $sort: { createdAt: -1 } },
    { $limit: 50 },
  ]);

  return results;
};

/**
 * Get per-topic progress over time (weekly/monthly).
 */
const getTopicProgress = async (userId, { granularity = "weekly", months = 3 } = {}) => {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const dateGroup = granularity === "monthly"
    ? { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }
    : { year: { $isoWeekYear: "$createdAt" }, week: { $isoWeek: "$createdAt" } };

  const buildPipeline = (startDate) => [
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        verdict: "Accepted",
        ...(startDate ? { createdAt: { $gte: startDate } } : {}),
      },
    },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: "$problem",
        firstAccepted: { $first: "$$ROOT" },
      },
    },
    { $replaceRoot: { newRoot: "$firstAccepted" } },
    { $lookup: { from: "problems", localField: "problem", foreignField: "_id", as: "prob" } },
    { $unwind: "$prob" },
    {
      $project: {
        createdAt: 1,
        topicTags: { $ifNull: ["$topicTags", "$prob.tags"] },
      },
    },
    { $unwind: "$topicTags" },
    { $group: { _id: { topic: "$topicTags", ...dateGroup }, solved: { $sum: 1 } } },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.week": 1 } },
  ];

  let results = await Submission.aggregate(buildPipeline(since));

  // Fallback for users with older history outside selected range.
  if (!results.length && months) {
    results = await Submission.aggregate(buildPipeline(null));
  }

  // Restructure into { topic: string, data: [{period, solved}] }
  const topicMap = {};
  for (const row of results) {
    const topic = row._id.topic;
    if (!topicMap[topic]) topicMap[topic] = [];
    const label = granularity === "monthly"
      ? `${row._id.year}-${String(row._id.month).padStart(2, "0")}`
      : `${row._id.year}-W${String(row._id.week).padStart(2, "0")}`;
    topicMap[topic].push({ period: label, solved: row.solved });
  }

  return Object.entries(topicMap)
    .map(([topic, data]) => ({ topic, data }))
    .sort((a, b) => b.data.reduce((s, d) => s + d.solved, 0) - a.data.reduce((s, d) => s + d.solved, 0))
    .slice(0, 7);
};

/**
 * Get rolling accuracy trend over time.
 */
const getAccuracyTrend = async (userId, { days = 30 } = {}) => {
  const since = new Date(Date.now() - days * 86400000);

  const results = await Submission.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId), createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        total: { $sum: 1 },
        accepted: { $sum: { $cond: [{ $eq: ["$verdict", "Accepted"] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { date: "$_id", total: 1, accepted: 1, accuracy: { $multiply: [{ $divide: ["$accepted", "$total"] }, 100] } } },
  ]);

  return results;
};

/**
 * Get average solve speed per difficulty over monthly periods.
 */
const getSolveSpeed = async (userId, { months = 6 } = {}) => {
  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const buildPipeline = (startDate) => [
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        verdict: "Accepted",
        ...(startDate ? { createdAt: { $gte: startDate } } : {}),
      },
    },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: "$problem",
        firstAccepted: { $first: "$$ROOT" },
      },
    },
    { $replaceRoot: { newRoot: "$firstAccepted" } },
    { $lookup: { from: "problems", localField: "problem", foreignField: "_id", as: "prob" } },
    { $unwind: "$prob" },
    {
      $project: {
        month: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
        difficulty: { $ifNull: ["$difficulty", "$prob.difficulty"] },
        solveTimeMs: {
          $let: {
            vars: { tt: { $ifNull: ["$timeTaken", 0] } },
            in: {
              $cond: [
                { $gt: ["$$tt", 0] },
                {
                  $cond: [
                    { $gt: ["$$tt", 10000] },
                    "$$tt",
                    { $multiply: ["$$tt", 1000] },
                  ],
                },
                { $ifNull: ["$runtime", 0] },
              ],
            },
          },
        },
      },
    },
    { $match: { solveTimeMs: { $gt: 0 } } },
    {
      $group: {
        _id: {
          month: "$month",
          difficulty: "$difficulty",
        },
        avgTime: { $avg: "$solveTimeMs" },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.month": 1 } },
  ];

  let results = await Submission.aggregate(buildPipeline(since));

  // Fallback for users with older solved history.
  if (!results.length && months) {
    results = await Submission.aggregate(buildPipeline(null));
  }

  return results.map((r) => ({
    month: r._id.month,
    difficulty: r._id.difficulty,
    avgTime: Math.round(r.avgTime),
    count: r.count,
  }));
};

/**
 * Get error type distribution per topic.
 */
const getTopicErrors = async (userId, { topic } = {}) => {
  const match = { user: new mongoose.Types.ObjectId(userId), verdict: { $ne: "Accepted" } };
  if (topic) match.topicTags = topic;

  const results = await Submission.aggregate([
    { $match: match },
    { $group: { _id: { topic: { $arrayElemAt: ["$topicTags", 0] }, verdict: "$verdict" }, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return results.map((r) => ({
    topic: r._id.topic,
    verdict: r._id.verdict,
    count: r.count,
  }));
};

/**
 * Get topic accuracy trends over weekly periods.
 */
const getTopicTrends = async (userId, { topics = [], weeks = 12 } = {}) => {
  const since = new Date(Date.now() - weeks * 7 * 86400000);
  const match = { user: new mongoose.Types.ObjectId(userId), createdAt: { $gte: since } };
  if (topics.length) match.topicTags = { $in: topics };

  const results = await Submission.aggregate([
    { $match: match },
    { $unwind: "$topicTags" },
    ...(topics.length ? [{ $match: { topicTags: { $in: topics } } }] : []),
    {
      $group: {
        _id: {
          topic: "$topicTags",
          week: { $isoWeek: "$createdAt" },
          year: { $isoWeekYear: "$createdAt" },
        },
        total: { $sum: 1 },
        accepted: { $sum: { $cond: [{ $eq: ["$verdict", "Accepted"] }, 1, 0] } },
      },
    },
    {
      $project: {
        topic: "$_id.topic",
        week: "$_id.week",
        year: "$_id.year",
        accuracy: { $multiply: [{ $divide: ["$accepted", "$total"] }, 100] },
        total: 1,
      },
    },
    { $sort: { year: 1, week: 1 } },
  ]);

  return results;
};

/**
 * Get grouped error pattern data for weakness analysis.
 */
const getErrorPatterns = async (userId) => {
  const results = await Submission.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        verdict: { $nin: [null, "Accepted"] },
      },
    },
    { $unwind: "$topicTags" },
    {
      $group: {
        _id: { topic: "$topicTags", verdict: "$verdict" },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 50 },
  ]);

  return results.map((r) => ({
    topic: r._id.topic,
    verdict: r._id.verdict,
    count: r.count,
  }));
};

/**
 * Get weakness comparison vs previous period.
 */
const getWeaknessComparison = async (userId) => {
  const WeaknessSnapshot = require("../models/WeaknessSnapshot");
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const prevDate = new Date(now);
  prevDate.setMonth(prevDate.getMonth() - 1);
  const lastMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;

  const [current, previous] = await Promise.all([
    WeaknessSnapshot.findOne({ userId, period: thisMonth }).lean(),
    WeaknessSnapshot.findOne({ userId, period: lastMonth }).lean(),
  ]);

  // If no snapshot exists for current month, compute on the fly
  if (!current) {
    const stats = await UserTopicStats.find({ userId }).lean();
    const weakStats = stats.filter((s) => s.totalAttempts >= 2 && s.accuracy < 50);
    const currentData = {
      weakTopicCount: weakStats.length,
      avgWeakAccuracy: weakStats.length
        ? Number((weakStats.reduce((s, t) => s + t.accuracy, 0) / weakStats.length).toFixed(1))
        : 0,
      avgWeakAttempts: weakStats.length
        ? Number((weakStats.reduce((s, t) => s + t.totalAttempts, 0) / weakStats.length).toFixed(1))
        : 0,
    };

    return { current: currentData, previous: previous || null };
  }

  return { current, previous };
};

/**
 * Get dynamic milestones based on actual user stats.
 */
const getDynamicMilestones = async (userId) => {
  const user = await User.findById(userId)
    .select("totalSolved easyCount mediumCount hardCount currentStreak maxStreak")
    .lean();
  if (!user) return [];

  const stats = await UserTopicStats.find({ userId }).lean();
  const milestones = [];

  // Solve count milestones
  const solveTiers = [1, 10, 25, 50, 100, 200, 500];
  for (const tier of solveTiers) {
    milestones.push({
      id: `solve-${tier}`,
      title: `Solve ${tier} Problem${tier > 1 ? "s" : ""}`,
      detail: `Complete ${tier} accepted submission${tier > 1 ? "s" : ""}`,
      earned: user.totalSolved >= tier,
      progress: Math.min(100, Math.round((user.totalSolved / tier) * 100)),
    });
    if (user.totalSolved < tier) break;
  }

  // Difficulty milestones
  [
    { key: "easyCount", label: "Easy", tiers: [5, 25, 50] },
    { key: "mediumCount", label: "Medium", tiers: [5, 25, 50] },
    { key: "hardCount", label: "Hard", tiers: [5, 15, 25] },
  ].forEach(({ key, label, tiers }) => {
    for (const tier of tiers) {
      const earned = user[key] >= tier;
      milestones.push({
        id: `${label.toLowerCase()}-${tier}`,
        title: `${tier} ${label} Done`,
        detail: `Solve ${tier} ${label} problems`,
        earned,
        progress: Math.min(100, Math.round((user[key] / tier) * 100)),
      });
      if (!earned) break;
    }
  });

  // Streak milestones
  const streakTiers = [3, 7, 14, 30];
  for (const tier of streakTiers) {
    milestones.push({
      id: `streak-${tier}`,
      title: `${tier}-Day Streak`,
      detail: `Maintain a ${tier}-day solving streak`,
      earned: user.maxStreak >= tier,
      progress: Math.min(100, Math.round((user.maxStreak / tier) * 100)),
    });
    if (user.maxStreak < tier) break;
  }

  // Topic mastery milestones
  const masteredTopics = stats.filter((s) => s.totalAttempts >= 10 && s.accuracy >= 80);
  if (masteredTopics.length) {
    masteredTopics.forEach((t) => {
      milestones.push({
        id: `master-${t.topic}`,
        title: `${t.topic} Master`,
        detail: `80%+ accuracy with 10+ attempts in ${t.topic}`,
        earned: true,
        progress: 100,
      });
    });
  }

  return milestones;
};

/**
 * Generate AI insight cards from user analytics data.
 */
const generateInsights = async (userId) => {
  const stats = await UserTopicStats.find({ userId }).lean();
  const user = await User.findById(userId)
    .select("totalSolved currentStreak easyCount mediumCount hardCount")
    .lean();
  if (!user || !stats.length) return [];

  const insights = [];

  // Weakest topic insight
  const weakest = stats
    .filter((s) => s.totalAttempts >= 3)
    .sort((a, b) => a.accuracy - b.accuracy)[0];
  if (weakest && weakest.accuracy < 60) {
    insights.push({
      type: "weakness",
      title: `${weakest.topic} needs work`,
      detail: `Your ${weakest.topic} accuracy is ${weakest.accuracy.toFixed(0)}% — focus here to improve.`,
      severity: weakest.accuracy < 30 ? "critical" : "warning",
    });
  }

  // Improving topic
  const improving = stats
    .filter((s) => s.recentResults.length >= 5)
    .find((s) => {
      const recent = s.recentResults.slice(-5);
      const recentAcc = recent.filter(Boolean).length / recent.length;
      return recentAcc > (s.accuracy / 100) + 0.15;
    });
  if (improving) {
    const recentAcc = (improving.recentResults.slice(-5).filter(Boolean).length / 5 * 100).toFixed(0);
    insights.push({
      type: "improvement",
      title: `${improving.topic} is improving`,
      detail: `Your recent ${improving.topic} accuracy is ${recentAcc}% vs ${improving.accuracy.toFixed(0)}% overall.`,
      severity: "positive",
    });
  }

  // Speed insight (if we have timing data)
  const withTime = stats.filter((s) => s.avgTimeTaken > 0 && s.totalAttempts >= 3);
  if (withTime.length >= 2) {
    const fastest = withTime.sort((a, b) => a.avgTimeTaken - b.avgTimeTaken)[0];
    insights.push({
      type: "speed",
      title: `Fastest at ${fastest.topic}`,
      detail: `You solve ${fastest.topic} problems in ~${Math.round(fastest.avgTimeTaken / 60)} min on average.`,
      severity: "neutral",
    });
  }

  // Streak insight
  if (user.currentStreak >= 3) {
    insights.push({
      type: "streak",
      title: `${user.currentStreak}-day streak`,
      detail: `You've been solving daily for ${user.currentStreak} days. Keep the momentum!`,
      severity: "positive",
    });
  }

  return insights.slice(0, 4);
};

module.exports = {
  updateUserTopicStats,
  updateProblemStats,
  updateUserProblemStatus,
  updateDailyActivity,
  updateUserCounters,
  getHeatmapData,
  getTopicAnalytics,
  runPostSubmissionPipeline,
  getAttemptEfficiency,
  getTopicProgress,
  getAccuracyTrend,
  getSolveSpeed,
  getTopicErrors,
  getTopicTrends,
  getErrorPatterns,
  getWeaknessComparison,
  getDynamicMilestones,
  generateInsights,
};
