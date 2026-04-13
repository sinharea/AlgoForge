const axios = require("axios");
const { openaiApiKey, openaiBaseUrl, openaiModel } = require("../config/env");
const logger = require("../utils/logger");

const MAX_USER_CODE_CHARS = 14000;
const MAX_OPTIMAL_CODE_CHARS = 14000;

const clampText = (value = "", maxChars = 12000) => {
  const text = String(value || "");
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n... [truncated]`;
};

const buildCodeReviewPrompt = ({ userCode, optimalCode, hint }) => `You are a senior competitive programming reviewer.

You MUST compute time complexity correctly using strict reasoning.

-------------------------------------

User Code:
${userCode}

Optimal Code:
${optimalCode}

Hint:
${hint}

-------------------------------------

RULES:

1. DO NOT guess complexity
2. You MUST follow step-by-step reasoning
3. HashMap/Set operations are O(1)
4. A single loop over input -> O(n)
5. Sequential loops -> O(n), NOT O(n^2)
6. Only nested loops -> O(n^2)

-------------------------------------

STEP 1: Identify all loops
STEP 2: Check if loops are nested or independent
STEP 3: Analyze operations inside loops
STEP 4: Compute final complexity

-------------------------------------

OUTPUT FORMAT:

Time Complexity:
- User: O(...)
- Optimal: O(...)

Explain reasoning in 1-2 lines.

-------------------------------------

FINAL RULE:

If there is only ONE loop over input, answer MUST be O(n).
Never output O(n^2) unless there is an actual nested loop.`;

const detectPatterns = (code = "") => {
  const text = String(code || "");
  return {
    loops: (text.match(/\bfor\b|\bwhile\b/g) || []).length,
    hasSort: /\bsort\s*\(|\.sort\s*\(/i.test(text),
    hasHashMap: /unordered_map|hashmap|\bmap\s*<|\bdict\b|\{\s*\}/i.test(text),
    hasSet: /unordered_set|\bset\s*<|\bSet\s*\(/i.test(text),
    hasRecursion: /\breturn\s+.*\b\w+\s*\(/i.test(text) && /\bfunction\b|\bdef\b|\bint\b|\bvoid\b/i.test(text),
    hasNestedLoops:
      /for[\s\S]{0,300}for/i.test(text) || /while[\s\S]{0,300}while/i.test(text),
  };
};

const buildFallbackReview = ({ userCode, optimalCode }) => {
  const userPatterns = detectPatterns(userCode);
  const optimalPatterns = optimalCode ? detectPatterns(optimalCode) : null;

  const userLoopComplexity = userPatterns.hasNestedLoops
    ? "likely O(n^2) or higher due to nested iteration"
    : userPatterns.loops > 0
      ? "likely O(n) to O(n log n), depending on inner operations"
      : "no explicit iterative pattern detected";

  const optimalLoopComplexity = optimalPatterns
    ? optimalPatterns.hasNestedLoops
      ? "optimal code still appears to use nested iteration"
      : optimalPatterns.hasSort
        ? "optimal code likely O(n log n) due to sorting"
        : "optimal code appears closer to linear or near-linear flow"
    : "optimal code unavailable";

  const differences = [];
  if (optimalPatterns) {
    differences.push(
      `User pattern: ${userPatterns.hasNestedLoops ? "nested loops" : "single-pass/limited loops"}; Optimal pattern: ${optimalPatterns.hasNestedLoops ? "nested loops" : "single-pass/limited loops"}.`
    );
    differences.push(`User complexity signal: ${userLoopComplexity}; Optimal signal: ${optimalLoopComplexity}.`);
  } else {
    differences.push(`User complexity signal: ${userLoopComplexity}.`);
    differences.push("Optimal code was not available, so comparison is limited to user code quality only.");
  }

  const inefficiencies = [];
  if (userPatterns.hasNestedLoops) {
    inefficiencies.push("Nested iteration suggests avoidable quadratic behavior on larger inputs.");
  }
  if (!userPatterns.hasHashMap && optimalPatterns?.hasHashMap) {
    inefficiencies.push("User code misses direct-index/hash lookup opportunities used by optimal logic.");
  }
  if (userPatterns.hasSort && optimalPatterns && !optimalPatterns.hasSort) {
    inefficiencies.push("User sorting step may add unnecessary O(n log n) overhead compared to optimal flow.");
  }
  if (!inefficiencies.length) {
    inefficiencies.push("No obvious anti-pattern from static scan; inspect branch-level logic and repeated computations.");
  }

  const betterApproach = [];
  if (optimalPatterns) {
    betterApproach.push("Align user traversal/state updates with the optimal solution's core state transition pattern.");
    betterApproach.push("Prefer one-pass state maintenance over repeated scanning when constraints are large.");
  } else {
    betterApproach.push("Refactor toward a single invariant-driven pass (hash map/sliding window/two pointers where applicable).");
  }

  const suggestions = [];
  suggestions.push("Remove repeated checks inside loops by precomputing or maintaining rolling state.");
  suggestions.push("If lookup by value/index is frequent, introduce a hash map/set to reduce search overhead.");
  suggestions.push("Validate edge cases explicitly: empty input, duplicates, boundaries, and large-size stress cases.");

  return [
    "Key Differences:",
    ...differences.map((item) => `- ${item}`),
    "",
    "Inefficiencies:",
    ...inefficiencies.map((item) => `- ${item}`),
    "",
    "Better Approach:",
    ...betterApproach.map((item) => `- ${item}`),
    "",
    "Suggestions:",
    ...suggestions.map((item) => `- ${item}`),
  ].join("\n");
};

const generateCodeReview = async ({ userCode, optimalCode = "", hint = "", user_code, optimal_code = "" }) => {
  const resolvedUserCode = userCode ?? user_code ?? "";
  const resolvedOptimalCode = optimalCode ?? optimal_code ?? "";
  const resolvedHint = String(hint || "").trim() || "No static hint available.";

  const safeUserCode = clampText(resolvedUserCode, MAX_USER_CODE_CHARS);
  const safeOptimalCodeRaw = String(resolvedOptimalCode || "").trim();
  const safeOptimalCode = clampText(safeOptimalCodeRaw, MAX_OPTIMAL_CODE_CHARS);
  const promptOptimalCode = safeOptimalCode || "[Optimal code not available]";
  const safeHint = clampText(resolvedHint, 1200);

  if (!openaiApiKey) {
    return buildFallbackReview({ userCode: safeUserCode, optimalCode: safeOptimalCodeRaw ? safeOptimalCode : "" });
  }

  const prompt = buildCodeReviewPrompt({
    userCode: safeUserCode,
    optimalCode: promptOptimalCode,
    hint: safeHint,
  });

  try {
    const response = await axios.post(
      `${openaiBaseUrl}/chat/completions`,
      {
        model: openaiModel,
        temperature: 0.1,
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const review = String(response.data?.choices?.[0]?.message?.content || "").trim();
    if (!review) {
      return buildFallbackReview({ userCode: safeUserCode, optimalCode: safeOptimalCodeRaw ? safeOptimalCode : "" });
    }
    return review;
  } catch (error) {
    logger.warn("AI code review failed; using fallback review", {
      error: error.response?.data?.error?.message || error.message,
    });
    return buildFallbackReview({ userCode: safeUserCode, optimalCode: safeOptimalCodeRaw ? safeOptimalCode : "" });
  }
};

module.exports = {
  buildCodeReviewPrompt,
  generateCodeReview,
};