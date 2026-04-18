const mongoose = require("mongoose");
const UserTopicStats = require("../models/UserTopicStats");
const ProblemStats = require("../models/ProblemStats");
const UserProblemStatus = require("../models/UserProblemStatus");
const DailyActivity = require("../models/DailyActivity");
const User = require("../models/User");

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

module.exports = {
  updateUserTopicStats,
  updateProblemStats,
  updateUserProblemStatus,
  updateDailyActivity,
  updateUserCounters,
  getHeatmapData,
  getTopicAnalytics,
  runPostSubmissionPipeline,
};
