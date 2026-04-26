const axios = require("axios");
const env = require("../config/env");

const ML_BASE_URL = env.mlServiceUrl;
const TIMEOUT_MS = 3000;

/**
 * Call the ML microservice to get P_solve predictions for a batch of problems.
 *
 * @param {Object} userFeatures - { global_accuracy, topic_accuracies, total_solved, recent_accuracy, comfort_level }
 * @param {Array} problems - [{ problem_id, difficulty, difficulty_score, tags }]
 * @returns {Array} - [{ problem_id, p_solve }] or null if service unavailable
 */
const predictSolveProbability = async (userFeatures, problems) => {
  if (!ML_BASE_URL) return null;

  try {
    const { data } = await axios.post(
      `${ML_BASE_URL}/predict`,
      { user: userFeatures, problems },
      { timeout: TIMEOUT_MS }
    );
    return data.predictions || null;
  } catch (err) {
    console.warn(`[mlClient] ML service unavailable: ${err.message}. Falling back to heuristic.`);
    return null;
  }
};

/**
 * Check if ML service is healthy.
 */
const isHealthy = async () => {
  if (!ML_BASE_URL) return false;
  try {
    const { data } = await axios.get(`${ML_BASE_URL}/health`, { timeout: 2000 });
    return data.status === "ok" && data.model_loaded === true;
  } catch {
    return false;
  }
};

module.exports = { predictSolveProbability, isHealthy };
