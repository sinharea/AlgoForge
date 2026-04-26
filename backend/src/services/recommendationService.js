const mongoose = require("mongoose");
const Problem = require("../models/Problem");
const UserTopicStats = require("../models/UserTopicStats");
const UserProblemStatus = require("../models/UserProblemStatus");
const Submission = require("../models/Submission");
const redis = require("../config/redis");
const { predictSolveProbability } = require("./mlClient");

const formatTopicRows = (rows = []) =>
  rows.map((row) => ({
    topic: row.topic,
    accuracy: Number(row.accuracy || 0),
    attempts: row.totalAttempts,
    correct: row.totalSolved,
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

const normalizeDifficultyKey = (value) => {
  const key = String(value || "").trim().toLowerCase();
  if (key === "easy") return "Easy";
  if (key === "medium") return "Medium";
  if (key === "hard") return "Hard";
  return null;
};

const normalizeTopicKey = (value) => String(value || "").trim().toLowerCase();

const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value));

const stableHash = (value = "") => {
  let hash = 0;
  const text = String(value || "");
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) % 1000003;
  }
  return hash;
};

const getUserDashboardStats = async (userId) => {
  const [solvedStatuses, attemptingCount, totalByDifficultyRows, totalByTopicRows] = await Promise.all([
    // Use UserProblemStatus for efficient solved query instead of aggregating Submissions
    UserProblemStatus.find({ userId, status: "solved" })
      .select("problemId")
      .lean(),
    UserProblemStatus.countDocuments({ userId, status: "attempted" }),
    Problem.aggregate([
      {
        $group: {
          _id: "$difficulty",
          count: { $sum: 1 },
        },
      },
    ]),
    Problem.aggregate([
      { $unwind: "$tags" },
      {
        $group: {
          _id: "$tags",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const solvedProblemIds = solvedStatuses.map((s) => s.problemId);

  const solvedProblems = await Problem.find({ _id: { $in: solvedProblemIds } })
    .select("difficulty tags")
    .lean();

  const difficultyStats = solvedProblems.reduce(
    (acc, row) => {
      const normalizedKey = normalizeDifficultyKey(row.difficulty);
      if (normalizedKey) {
        acc[normalizedKey] = (acc[normalizedKey] || 0) + 1;
      }
      return acc;
    },
    { Easy: 0, Medium: 0, Hard: 0 }
  );

  const topicStats = solvedProblems.reduce((acc, row) => {
    (row.tags || []).forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {});

  const byDifficultyTotals = totalByDifficultyRows.reduce(
    (acc, row) => {
      const normalizedKey = normalizeDifficultyKey(row?._id);
      if (normalizedKey) {
        acc[normalizedKey] = (acc[normalizedKey] || 0) + Number(row.count || 0);
      }
      return acc;
    },
    { Easy: 0, Medium: 0, Hard: 0 }
  );

  const byTopicTotals = totalByTopicRows.reduce((acc, row) => {
    const topic = String(row?._id || "").trim();
    if (!topic) return acc;
    acc[topic] = Number(row.count || 0);
    return acc;
  }, {});

  const totalProblems = byDifficultyTotals.Easy + byDifficultyTotals.Medium + byDifficultyTotals.Hard;

  return {
    totalSolved: solvedProblems.length,
    totalProblems,
    byDifficulty: difficultyStats,
    byDifficultyTotals,
    byTopic: topicStats,
    byTopicTotals,
    attemptingCount,
  };
};

const getRecommendations = async (userId, modificationHints = null) => {
  const cacheKey = modificationHints
    ? `recommendations:${userId}:mod:${stableHash(JSON.stringify(modificationHints))}`
    : `recommendations:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const analytics = await UserTopicStats.find({ userId }).sort({ accuracy: 1 }).lean();
  const weakTopicRows = (analytics || [])
    .filter((t) => t.totalAttempts >= 2)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);

  const weakTopics = weakTopicRows.map((t) => t.topic);
  const weakTopicMap = weakTopicRows.reduce((acc, row) => {
    acc[normalizeTopicKey(row.topic)] = {
      accuracy: Number(row.accuracy || 0),
      attempts: Number(row.totalAttempts || 0),
    };
    return acc;
  }, {});

  // Build per-topic accuracy map (0-1) for ML service
  const topicAccuracies = {};
  for (const stat of analytics) {
    topicAccuracies[stat.topic] = (stat.accuracy || 0) / 100;
  }

  const solvedProblemIds = (await UserProblemStatus.find({ userId, status: "solved" })
    .select("problemId")
    .lean()
  ).map((s) => s.problemId);

  const totalSolved = solvedProblemIds.length;

  // Apply modification hints if provided
  let targetDifficulty = totalSolved < 10 ? "Easy" : totalSolved < 40 ? "Medium" : "Hard";
  let boostTopics = [];
  if (modificationHints) {
    if (modificationHints.difficulty) {
      targetDifficulty = normalizeDifficultyKey(modificationHints.difficulty) || targetDifficulty;
    }
    if (modificationHints.focusTopics && modificationHints.focusTopics.length) {
      boostTopics = modificationHints.focusTopics;
    }
  }

  const query = {
    _id: { $nin: solvedProblemIds },
    ...(boostTopics.length
      ? { tags: { $in: boostTopics } }
      : weakTopics.length
        ? { tags: { $in: weakTopics } }
        : {}),
  };

  // Fetch more candidates for ML scoring (wider pool)
  let candidates = await Problem.find(query)
    .select("title slug difficulty tags difficultyScore questionNumber")
    .limit(50)
    .lean();

  if (candidates.length < 15) {
    const existingIds = candidates.map((c) => c._id);
    const fallback = await Problem.find({
      _id: { $nin: [...solvedProblemIds, ...existingIds] },
    })
      .select("title slug difficulty tags difficultyScore questionNumber")
      .limit(50 - candidates.length)
      .lean();
    candidates = [...candidates, ...fallback];
  }

  // Compute global accuracy for user
  const globalAccuracy = analytics.length
    ? analytics.reduce((s, t) => s + t.accuracy, 0) / analytics.length / 100
    : 0.5;

  // Recent accuracy from recent results across all topics
  const allRecent = analytics.flatMap((t) => t.recentResults || []);
  const recentAccuracy = allRecent.length
    ? allRecent.filter(Boolean).length / allRecent.length
    : globalAccuracy;

  // --- Try ML scoring via microservice ---
  const userFeatures = {
    global_accuracy: globalAccuracy,
    topic_accuracies: topicAccuracies,
    total_solved: totalSolved,
    recent_accuracy: recentAccuracy,
    comfort_level: targetDifficulty,
  };

  // Get prior attempt counts for candidate problems (0 for never-attempted)
  const candidateIds = candidates.map((c) => c._id);
  const priorAttempts = await UserProblemStatus.find({
    userId,
    problemId: { $in: candidateIds },
    status: "attempted",
  }).select("problemId totalAttempts").lean();
  const attemptMap = {};
  for (const pa of priorAttempts) {
    attemptMap[String(pa.problemId)] = pa.totalAttempts || 0;
  }

  const mlProblems = candidates.map((p) => ({
    problem_id: String(p._id),
    difficulty: p.difficulty,
    difficulty_score: p.difficultyScore || 5,
    tags: p.tags || [],
    attempt_count: attemptMap[String(p._id)] || 0,
  }));

  const mlPredictions = await predictSolveProbability(userFeatures, mlProblems);
  const pSolveMap = {};
  if (mlPredictions) {
    for (const pred of mlPredictions) {
      pSolveMap[pred.problem_id] = pred.p_solve;
    }
  }

  const useML = mlPredictions !== null;

  // --- Score each candidate: S(u,p) = 0.55*P_solve + 0.35*ΔSkill + 0.10*N ---
  const enrichedSuggestions = candidates.map((problem) => {
    const pid = String(problem._id);
    const normalizedTags = (problem.tags || []).map(normalizeTopicKey);
    const matchingWeakTopics = normalizedTags.filter((tag) => weakTopicMap[tag]);
    const overlapCount = matchingWeakTopics.length;

    if (useML) {
      // P_solve from ML model
      const pSolve = pSolveMap[pid] ?? 0.5;

      // ΔSkill: expected skill gain from solving this problem
      let deltaSkill = 0;
      if (matchingWeakTopics.length > 0) {
        deltaSkill = matchingWeakTopics.reduce((sum, tag) => {
          const acc = weakTopicMap[tag] ? weakTopicMap[tag].accuracy / 100 : 0.5;
          return sum + (1 - acc);
        }, 0) / Math.max(Object.keys(weakTopicMap).length, 1);
      }
      deltaSkill = clampNumber(deltaSkill, 0, 1);

      // N(u,p): novelty / anti-repetition
      const unseenTopicRatio = normalizedTags.length
        ? normalizedTags.filter((t) => !topicAccuracies[t] || topicAccuracies[t] < 0.05).length / normalizedTags.length
        : 0;
      const spreadVal = (stableHash(pid) % 100) / 100;
      const novelty = clampNumber(unseenTopicRatio * 0.6 + spreadVal * 0.4, 0, 1);

      // Boost topics from modification hints
      let modBoost = 0;
      if (boostTopics.length) {
        const boostMatch = normalizedTags.filter((t) =>
          boostTopics.some((bt) => normalizeTopicKey(bt) === t)
        ).length;
        modBoost = boostMatch > 0 ? 0.1 : 0;
      }

      const score = 0.55 * pSolve + 0.35 * deltaSkill + 0.10 * novelty + modBoost;
      const confidenceScore = clampNumber(Math.round(score * 100), 10, 99);

      return {
        ...problem,
        confidenceScore,
        pSolve: Math.round(pSolve * 100),
        deltaSkill: Math.round(deltaSkill * 100),
        novelty: Math.round(novelty * 100),
        recommendationTag: overlapCount > 0 ? "Fix Weakness" : "Level Up",
        matchedWeakTopics: matchingWeakTopics.slice(0, 2),
        modelVersion: "v2-ml",
      };
    } else {
      // Heuristic fallback (original logic)
      const weakTopicAvgGap = overlapCount
        ? matchingWeakTopics.reduce((sum, tag) => sum + (100 - weakTopicMap[tag].accuracy), 0) / overlapCount
        : 0;

      const weaknessComponent = Math.round((weakTopicAvgGap / 100) * 18);
      const overlapComponent = overlapCount * 8;
      const normalizedTargetDifficulty = normalizeDifficultyKey(targetDifficulty);
      const difficultyComponent =
        normalizeDifficultyKey(problem.difficulty) === normalizedTargetDifficulty ? 10 : -4;
      const qualityComponent = Math.min(Number(problem.difficultyScore || 0), 10) / 2;
      const spreadComponent = stableHash(pid) % 7;

      const confidenceScore = clampNumber(
        Math.round(54 + weaknessComponent + overlapComponent + difficultyComponent + qualityComponent + spreadComponent),
        55,
        96
      );

      return {
        ...problem,
        confidenceScore,
        recommendationTag: overlapCount > 0 ? "Fix Weakness" : "Level Up",
        matchedWeakTopics: matchingWeakTopics.slice(0, 2),
        modelVersion: "v1-heuristic",
      };
    }
  });

  // Sort by score descending, take top 15
  enrichedSuggestions.sort((a, b) => b.confidenceScore - a.confidenceScore);

  const payload = {
    weakTopics,
    targetDifficulty,
    modelVersion: useML ? "v2-ml" : "v1-heuristic",
    suggestions: enrichedSuggestions.slice(0, 15),
  };

  await redis.set(cacheKey, JSON.stringify(payload), "EX", 60);
  return payload;
};

const getWeaknessReport = async (userId) => {
  const stats = await UserTopicStats.find({ userId }).sort({ accuracy: 1, totalAttempts: -1 }).lean();
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

  const strongTopics = normalizedStats
    .filter((row) => row.attempts >= 2 && row.accuracy >= 70)
    .sort((a, b) => b.accuracy - a.accuracy || b.attempts - a.attempts)
    .slice(0, 5);

  const strongTopicNames = new Set(strongTopics.map((row) => row.topic));

  const weakTopics = normalizedStats
    .filter((row) => row.attempts >= 2 && !strongTopicNames.has(row.topic))
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts)
    .slice(0, 5);

  const fallbackWeak = !weakTopics.length
    ? normalizedStats.filter((row) => !strongTopicNames.has(row.topic)).slice(0, Math.min(3, normalizedStats.length))
    : weakTopics;

  const weakTopicNames = fallbackWeak.map((row) => row.topic);

  const solvedProblemIds = (await UserProblemStatus.find({ userId, status: "solved" })
    .select("problemId")
    .lean()
  ).map((s) => s.problemId);

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

/**
 * Get detailed weakness report with severity scoring.
 */
const getDetailedWeakness = async (userId) => {
  const stats = await UserTopicStats.find({ userId }).lean();
  const normalizedStats = stats.filter((s) => s.totalAttempts > 0);

  if (!normalizedStats.length) {
    return {
      severityMatrix: [],
      recommended_problems: [],
      strategy: "No data yet. Start solving tagged problems.",
    };
  }

  // Compute severity for each topic
  const maxAttempts = Math.max(...normalizedStats.map((s) => s.totalAttempts), 1);
  const severityMatrix = normalizedStats.map((s) => {
    const daysSinceLast = s.lastAttemptedAt
      ? Math.floor((Date.now() - new Date(s.lastAttemptedAt).getTime()) / 86400000)
      : 30;

    // Trend from recent results
    let trend = "flat";
    if (s.recentResults.length >= 6) {
      const firstHalf = s.recentResults.slice(0, Math.floor(s.recentResults.length / 2));
      const secondHalf = s.recentResults.slice(Math.floor(s.recentResults.length / 2));
      const firstAcc = firstHalf.filter(Boolean).length / firstHalf.length;
      const secondAcc = secondHalf.filter(Boolean).length / secondHalf.length;
      if (secondAcc > firstAcc + 0.1) trend = "improving";
      else if (secondAcc < firstAcc - 0.1) trend = "declining";
    }

    // Difficulty gap: Easy vs Hard accuracy difference
    const easyAcc = s.easyAttempts ? (s.easySolved / s.easyAttempts) : 0;
    const hardAcc = s.hardAttempts ? (s.hardSolved / s.hardAttempts) : 0;
    const difficultyGap = Math.max(0, easyAcc - hardAcc);

    // Severity score
    const trendPenalty = trend === "declining" ? 0.3 : trend === "flat" ? 0.15 : 0;
    const severity =
      (1 - s.accuracy / 100) * 0.3 +
      trendPenalty * 0.2 +
      (s.totalAttempts / maxAttempts) * 0.15 +
      Math.min(daysSinceLast / 30, 1) * 0.15 +
      difficultyGap * 0.1 +
      (1 - s.accuracy / 100) * 0.1;

    let severityLabel = "Low";
    if (severity > 0.6) severityLabel = "Critical";
    else if (severity > 0.4) severityLabel = "High";
    else if (severity > 0.25) severityLabel = "Medium";

    return {
      topic: s.topic,
      accuracy: Number(s.accuracy.toFixed(1)),
      totalAttempts: s.totalAttempts,
      totalSolved: s.totalSolved,
      avgAttempts: s.totalAttempts > 0 ? Number((s.totalAttempts / Math.max(s.totalSolved, 1)).toFixed(1)) : 0,
      avgTimeTaken: Math.round(s.avgTimeTaken / 60),
      trend,
      daysSinceLast,
      severity: Number(severity.toFixed(3)),
      severityLabel,
      streakInTopic: s.streakInTopic,
      recentResults: s.recentResults.slice(-10),
      easyAcc: s.easyAttempts ? Number(((s.easySolved / s.easyAttempts) * 100).toFixed(1)) : null,
      mediumAcc: s.mediumAttempts ? Number(((s.mediumSolved / s.mediumAttempts) * 100).toFixed(1)) : null,
      hardAcc: s.hardAttempts ? Number(((s.hardSolved / s.hardAttempts) * 100).toFixed(1)) : null,
      easySolved: s.easySolved,
      easyAttempts: s.easyAttempts,
      mediumSolved: s.mediumSolved,
      mediumAttempts: s.mediumAttempts,
      hardSolved: s.hardSolved,
      hardAttempts: s.hardAttempts,
    };
  }).sort((a, b) => b.severity - a.severity);

  // Get ML-scored recommended problems
  const weakTopicNames = severityMatrix
    .filter((t) => t.severityLabel !== "Low")
    .slice(0, 5)
    .map((t) => t.topic);

  const solvedProblemIds = (
    await UserProblemStatus.find({ userId, status: "solved" }).select("problemId").lean()
  ).map((s) => s.problemId);

  let recommendedProblems = [];
  if (weakTopicNames.length) {
    recommendedProblems = await Problem.find({
      _id: { $nin: solvedProblemIds },
      tags: { $in: weakTopicNames },
    })
      .select("title slug difficulty tags")
      .limit(15)
      .lean();
  }

  // Add "why recommended" reason to each problem
  recommendedProblems = recommendedProblems.map((p) => {
    const matchingTopic = weakTopicNames.find((t) => (p.tags || []).includes(t));
    const topicData = matchingTopic ? severityMatrix.find((s) => s.topic === matchingTopic) : null;
    let reason = "Targets your weak areas";
    let priority = "Medium";

    if (topicData) {
      if (topicData.severityLabel === "Critical") {
        reason = `Targets your weakest topic (${topicData.topic}, ${topicData.accuracy}% accuracy)`;
        priority = "Critical";
      } else if (topicData.daysSinceLast > 7) {
        reason = `You haven't practiced ${topicData.topic} in ${topicData.daysSinceLast} days`;
        priority = "High";
      } else if (topicData.trend === "declining") {
        reason = `Your ${topicData.topic} accuracy has been declining`;
        priority = "High";
      } else {
        reason = `Reinforces ${topicData.topic} (${topicData.accuracy}% accuracy)`;
      }
    }

    return {
      id: p._id,
      title: p.title,
      slug: p.slug,
      difficulty: p.difficulty,
      tags: p.tags || [],
      reason,
      priority,
    };
  });

  // Sort by priority
  const priorityOrder = { Critical: 0, High: 1, Medium: 2 };
  recommendedProblems.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));

  return {
    severityMatrix,
    recommended_problems: recommendedProblems.slice(0, 12),
    strategy: buildImprovementStrategy({
      weakTopics: severityMatrix.filter((t) => t.accuracy < 50).slice(0, 5),
      strongTopics: severityMatrix.filter((t) => t.accuracy >= 70),
      recommendationCount: recommendedProblems.length,
    }),
  };
};

/**
 * Parse a user's free-text modification request into structured hints.
 * e.g. "focus on graphs and trees, easier problems" → { focusTopics: ["Graphs","Trees"], difficulty: "Easy" }
 */
const parseModificationHints = (text) => {
  if (!text || typeof text !== "string") return {};
  const lower = text.toLowerCase();

  const hints = {};

  // Detect difficulty preference
  if (/\beasier\b|\beasy\b/.test(lower)) hints.difficulty = "Easy";
  else if (/\bharder\b|\bhard\b|\bchalleng/.test(lower)) hints.difficulty = "Hard";
  else if (/\bmedium\b/.test(lower)) hints.difficulty = "Medium";

  // Detect topic preferences — match known tags
  const knownTopics = [
    "Arrays", "Strings", "Dynamic Programming", "Graphs", "Trees",
    "BFS/DFS", "BFS", "DFS", "Sorting", "Binary Search", "Hash Table",
    "Linked List", "Stack", "Queue", "Greedy", "Recursion", "Math",
  ];
  const focusTopics = knownTopics.filter((t) => lower.includes(t.toLowerCase()));
  // Normalize BFS/DFS
  if (focusTopics.includes("BFS") || focusTopics.includes("DFS")) {
    if (!focusTopics.includes("BFS/DFS")) focusTopics.push("BFS/DFS");
  }
  const uniqueTopics = [...new Set(focusTopics.filter((t) => t !== "BFS" && t !== "DFS"))];
  if (uniqueTopics.length) hints.focusTopics = uniqueTopics;

  return hints;
};

module.exports = {
  getUserDashboardStats,
  getRecommendations,
  getWeaknessReport,
  getDetailedWeakness,
  parseModificationHints,
};
