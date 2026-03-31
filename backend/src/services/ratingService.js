const User = require("../models/User");
const RatingHistory = require("../models/RatingHistory");
const Contest = require("../models/Contest");
const ContestSubmission = require("../models/ContestSubmission");
const logger = require("../utils/logger");

// Default starting rating
const DEFAULT_RATING = 1500;

// Elo-based rating calculation constants
const K_FACTOR = 32; // Maximum rating change
const RATING_FLOOR = 0; // Minimum possible rating

/**
 * Calculate expected score based on rating difference
 * Uses logistic probability formula
 */
const expectedScore = (ratingA, ratingB) => {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
};

/**
 * Calculate performance rating for a user based on their rank
 * Uses simplified Codeforces-style calculation
 */
const calculatePerformanceRating = (rank, participantsCount, averageRating) => {
  // Performance = average rating + adjustment based on rank percentile
  const percentile = (participantsCount - rank) / participantsCount;
  const adjustment = 800 * (percentile - 0.5); // +400 for 1st place, -400 for last
  return Math.round(averageRating + adjustment);
};

/**
 * Calculate new rating based on performance
 * @param {number} currentRating - User's current rating
 * @param {number} performanceRating - User's performance in this contest
 * @param {number} contestsCount - Number of contests user has participated in
 */
const calculateNewRating = (currentRating, performanceRating, contestsCount) => {
  // For newer users, ratings change more significantly
  const k = contestsCount < 5 ? K_FACTOR * 1.5 : K_FACTOR;

  // Weight performance rating more heavily for new users
  const weight = Math.min(contestsCount / 10, 0.9);
  const ratingChange = (performanceRating - currentRating) * (1 - weight) * (k / 100);

  const newRating = Math.max(RATING_FLOOR, Math.round(currentRating + ratingChange));
  return {
    newRating,
    ratingChange: newRating - currentRating,
  };
};

/**
 * Calculate ratings for all participants in a contest
 * @param {string} contestId - The contest ID
 */
const calculateContestRatings = async (contestId) => {
  const contest = await Contest.findById(contestId);
  if (!contest) {
    throw new Error("Contest not found");
  }

  if (contest.isRated === false) {
    logger.info("Contest is unrated, skipping rating calculation", { contestId });
    return [];
  }

  // Get all contest submissions grouped by user
  const submissions = await ContestSubmission.find({ contest: contestId })
    .populate("user", "name rating contestsParticipated")
    .sort({ score: -1, penalty: 1 });

  if (submissions.length === 0) {
    logger.info("No submissions for contest, skipping rating calculation", { contestId });
    return [];
  }

  // Build leaderboard with ranks
  const leaderboard = [];
  let currentRank = 1;
  let prevScore = null;
  let prevPenalty = null;

  for (let i = 0; i < submissions.length; i++) {
    const sub = submissions[i];

    // Handle ties - same score and penalty = same rank
    if (sub.score !== prevScore || sub.penalty !== prevPenalty) {
      currentRank = i + 1;
    }

    leaderboard.push({
      userId: sub.user._id,
      userName: sub.user.name,
      currentRating: sub.user.rating || DEFAULT_RATING,
      contestsCount: sub.user.contestsParticipated || 0,
      score: sub.score,
      penalty: sub.penalty,
      rank: currentRank,
    });

    prevScore = sub.score;
    prevPenalty = sub.penalty;
  }

  // Calculate average rating of participants
  const totalRating = leaderboard.reduce((sum, p) => sum + p.currentRating, 0);
  const averageRating = totalRating / leaderboard.length;

  // Calculate new ratings for each participant
  const ratingChanges = [];

  for (const participant of leaderboard) {
    const performanceRating = calculatePerformanceRating(
      participant.rank,
      leaderboard.length,
      averageRating
    );

    const { newRating, ratingChange } = calculateNewRating(
      participant.currentRating,
      performanceRating,
      participant.contestsCount
    );

    ratingChanges.push({
      userId: participant.userId,
      userName: participant.userName,
      rank: participant.rank,
      oldRating: participant.currentRating,
      newRating,
      ratingChange,
      performanceRating,
    });
  }

  return ratingChanges;
};

/**
 * Apply rating changes to users and save history
 * @param {string} contestId - The contest ID
 * @param {Array} ratingChanges - Array of rating change objects
 */
const applyRatingChanges = async (contestId, ratingChanges) => {
  const operations = [];

  for (const change of ratingChanges) {
    // Update user rating
    operations.push(
      User.findByIdAndUpdate(
        change.userId,
        {
          $set: {
            rating: change.newRating,
            maxRating: change.newRating > change.oldRating
              ? change.newRating
              : undefined, // Only update if new max
          },
          $inc: { contestsParticipated: 1 },
        },
        { new: true }
      ).then(async (user) => {
        // Create rating history entry
        await RatingHistory.create({
          user: change.userId,
          contest: contestId,
          oldRating: change.oldRating,
          newRating: change.newRating,
          ratingChange: change.ratingChange,
          rank: change.rank,
          performanceRating: change.performanceRating,
        });

        // Update maxRating if needed (separate update to handle $max properly)
        if (change.newRating > (user.maxRating || 0)) {
          await User.findByIdAndUpdate(change.userId, {
            maxRating: change.newRating,
          });
        }
      })
    );
  }

  await Promise.all(operations);
  logger.info("Rating changes applied", { contestId, participantsCount: ratingChanges.length });
};

/**
 * Process ratings for a contest that has ended
 * @param {string} contestId - The contest ID
 */
const processContestRatings = async (contestId) => {
  try {
    const contest = await Contest.findById(contestId);
    if (!contest) {
      throw new Error("Contest not found");
    }

    if (contest.ratingsProcessed) {
      logger.info("Ratings already processed for contest", { contestId });
      return;
    }

    const ratingChanges = await calculateContestRatings(contestId);

    if (ratingChanges.length > 0) {
      await applyRatingChanges(contestId, ratingChanges);
    }

    // Mark contest as ratings processed
    contest.ratingsProcessed = true;
    await contest.save();

    return ratingChanges;
  } catch (error) {
    logger.error("Failed to process contest ratings", {
      contestId,
      error: error.message,
    });
    throw error;
  }
};

/**
 * Get rating history for a user
 * @param {string} userId - The user ID
 */
const getUserRatingHistory = async (userId) => {
  return RatingHistory.find({ user: userId })
    .populate("contest", "title startTime")
    .sort({ createdAt: -1 });
};

/**
 * Get rating leaderboard
 * @param {Object} options - Pagination options
 */
const getRatingLeaderboard = async ({ page = 1, limit = 50 } = {}) => {
  const users = await User.find({ contestsParticipated: { $gt: 0 } })
    .select("name rating maxRating contestsParticipated")
    .sort({ rating: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await User.countDocuments({ contestsParticipated: { $gt: 0 } });

  return {
    users,
    total,
    page,
    pages: Math.ceil(total / limit),
  };
};

module.exports = {
  calculateContestRatings,
  applyRatingChanges,
  processContestRatings,
  getUserRatingHistory,
  getRatingLeaderboard,
  DEFAULT_RATING,
  calculatePerformanceRating,
  calculateNewRating,
  expectedScore,
};
