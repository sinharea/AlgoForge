const axios = require("axios");
const {
  geminiApiKey,
  geminiBaseUrl,
  geminiModel,
  openaiApiKey,
  openaiBaseUrl,
  openaiModel,
} = require("../config/env");
const logger = require("../utils/logger");

const MAX_PROBLEM_CHARS = 4600;
const MAX_HISTORY_CHARS = 3600;
const MAX_USER_ANSWER_CHARS = 700;
const MAX_RESPONSE_CHARS = 360;
const LLM_TEMPERATURE = 0.1;
const LLM_TOP_P = 0.25;
const DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_OPENROUTER_MODEL = "openai/gpt-oss-120b:free";

let openRouterClientPromise;

const STAGE_KEYWORDS = {
  approach: ["approach", "idea", "intuition", "strategy", "start", "data structure", "hash", "two pointer", "sliding"],
  complexity: ["complexity", "big-o", "time", "space", "o(", "linear", "quadratic", "log"],
  edge_cases: ["edge", "corner", "empty", "duplicate", "null", "boundary", "overflow", "large input"],
  optimization: ["optimi", "improv", "trade-off", "tradeoff", "memory", "runtime", "faster"],
  coding: ["code", "implement", "function", "loop", "condition", "invariant", "pseudo"],
};

const clampText = (text = "", maxChars = 1000) => {
  const value = String(text || "").trim();
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}...`;
};

const formatConversationHistory = (messages = [], maxMessages = 8) => {
  const recent = messages.slice(-maxMessages);
  const lines = recent.map((message) => {
    const speaker = message.role === "user" ? "User" : "Interviewer";
    return `${speaker}: ${clampText(message.content || "", 420)}`;
  });

  return clampText(lines.join("\n"), MAX_HISTORY_CHARS) || "No prior messages yet.";
};

const buildInterviewerPrompt = ({
  problemStatement,
  conversationHistory,
  currentStage,
  stageMastery,
  struggleCount,
  answerAssessment,
  latestUserAnswer,
  avoidQuestion,
}) => `You are a senior software engineer conducting a realistic live coding interview.

Interview mode:
- Human, concise, direct.
- Industry-grade technical signal.
- Never sound scripted, random, or like a tutor.

Problem:
${problemStatement}

Conversation so far:
${conversationHistory}

Candidate's latest answer:
${clampText(latestUserAnswer || "", MAX_USER_ANSWER_CHARS) || "No answer yet."}

Current interview stage: ${currentStage}
Stage depth completed in this stage: ${Number(stageMastery || 0)} / 2
Candidate struggle level: ${struggleCount}
Candidate answer assessment: ${answerAssessment}

Stage focus (strict):
- approach: core strategy, data-structure choice, why it should work
- complexity: exact time/space cost and what drives it
- edge_cases: boundary and failure inputs
- optimization: practical trade-offs and bottlenecks
- coding: implementation structure, invariants, and pitfalls

Behavior rules:
1) Start by reacting to the candidate's latest answer naturally.
2) Then ask exactly one focused follow-up question tied to the stage.
3) Keep total response to 1-2 short lines, max 45 words.
4) No generic filler, no motivational talk, no off-topic comments.
5) Do not repeat previous interviewer wording.
6) If struggleCount is 2+, include a targeted hint before the follow-up question.
7) Ask questions that a real interviewer at a strong engineering company would ask.
8) Never agree with a wrong or unclear answer.
9) If answerAssessment is "wrong" or "no_answer", challenge directly with mild objection.
10) If answerAssessment is "partial", acknowledge partial progress but do not confirm correctness.

Do not repeat this wording:
${avoidQuestion || "N/A"}

Return only the next interviewer message text. No markdown, no bullets.`;

const reactionMap = {
  correct: "yeah, that makes sense.",
  partial: "you're close, think about this:",
  wrong: "hmm, not exactly...",
  no_answer: "that's okay, let's think about it.",
};

const stageFallbackQuestions = {
  approach: [
    "okay, walk me through the strategy you'd start with and why it should work.",
    "hmm, what data structure is central to your approach, and why?",
  ],
  complexity: [
    "interesting, where does most of the runtime come from in your solution?",
    "right, what's your exact time and space complexity, and why?",
  ],
  edge_cases: [
    "hmm, which edge case would break your first implementation?",
    "okay, what happens for empty input, duplicates, or boundary values?",
  ],
  optimization: [
    "right, if you had to optimize one bottleneck first, what would it be?",
    "interesting, what trade-off would you accept for better runtime here?",
  ],
  coding: [
    "okay, how would you structure the implementation before writing lines of code?",
    "right, what invariant will you maintain inside your main loop?",
  ],
};

const stageHintPrompts = {
  approach: {
    small: "small hint: isolate the information you must know before each decision.",
    clear: "clearer hint: choose a structure that gives predictable lookup/update cost.",
  },
  complexity: {
    small: "small hint: count work per element, then add setup cost.",
    clear: "clearer hint: state dominant term and memory growth separately.",
  },
  edge_cases: {
    small: "small hint: test empty, single, duplicate, and boundary values.",
    clear: "clearer hint: include invalid order, min/max boundaries, and repeated values.",
  },
  optimization: {
    small: "small hint: identify the hottest section of work first.",
    clear: "clearer hint: trade memory for fewer passes only if it reduces dominant cost.",
  },
  coding: {
    small: "small hint: define your loop invariant before implementation details.",
    clear: "clearer hint: lock update order, guard checks, and exit conditions first.",
  },
};

const fallbackInterviewerMessage = ({
  isSessionStart,
  currentStage = "approach",
  stageMastery = 0,
  struggleCount = 0,
  answerAssessment = "partial",
  avoidQuestion,
  retryCount = 0,
}) => {
  const stage = stageFallbackQuestions[currentStage] ? currentStage : "approach";
  const reaction = reactionMap[answerAssessment] || reactionMap.partial;

  if (isSessionStart && stage === "approach") {
    return stageFallbackQuestions.approach[0];
  }

  const hints = stageHintPrompts[stage] || stageHintPrompts.approach;
  if (struggleCount === 1) {
    return `${reaction} ${hints.small}`;
  }

  if (struggleCount === 2) {
    return `${reaction} ${hints.clear}`;
  }

  if (Number(stageMastery || 0) >= 1 && struggleCount === 0) {
    const deeper = {
      approach: "okay, now justify why this approach remains correct across all input patterns?",
      complexity: "right, which operation dominates your runtime and why?",
      edge_cases: "hmm, which exact boundary case is most likely to fail first?",
      optimization: "interesting, what optimization gives the best gain for the least complexity?",
      coding: "right, what invariant will you enforce at each loop iteration?",
    };
    return `${reaction} ${deeper[stage] || deeper.approach}`;
  }

  const stagePrompt = stageFallbackQuestions[stage][retryCount % stageFallbackQuestions[stage].length];
  if (avoidQuestion && stagePrompt.toLowerCase() === String(avoidQuestion).toLowerCase()) {
    return `${reaction} ${stageFallbackQuestions[stage][(retryCount + 1) % stageFallbackQuestions[stage].length]}`;
  }

  return `${reaction} ${stagePrompt}`;
};

const enforceSingleAsk = (text = "") => {
  const value = String(text || "").trim();
  const firstQuestionIndex = value.indexOf("?");
  if (firstQuestionIndex === -1) return value;
  return value.slice(0, firstQuestionIndex + 1).trim();
};

const sanitizeInterviewerMessage = (content) => {
  const cleaned = String(content || "")
    .replace(/^Interviewer:\s*/i, "")
    .replace(/^Next interviewer message:\s*/i, "")
    .replace(/^Only the next interviewer message\.?\s*/i, "")
    .replace(/^Return only the next interviewer message\.?\s*/i, "")
    .replace(/^\"+|\"+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const maxCharsMessage = clampText(cleaned, MAX_RESPONSE_CHARS);
  const maxLinesMessage = maxCharsMessage
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join("\n");

  const singleAskMessage = enforceSingleAsk(maxLinesMessage).replace(/[\s,;:-]+$/g, "");
  return singleAskMessage || "hmm, can you walk me through your next step?";
};

const isUsableInterviewerMessage = ({ message, currentStage }) => {
  const text = String(message || "").trim();
  if (!text) return false;
  if (text.length < 10) return false;

  const lower = text.toLowerCase();
  if (/as an ai|language model|i cannot assist|i'm unable to/i.test(lower)) return false;

  const stage = STAGE_KEYWORDS[currentStage] ? currentStage : "approach";
  const hasStageKeyword = STAGE_KEYWORDS[stage].some((keyword) => lower.includes(keyword));
  const hasQuestionOrHint = /\?|hint|consider|try|focus|walk me through|what if|how would|can you/.test(lower);
  const hasInterviewerTone = /\b(hmm|okay|interesting|right|makes sense|close|not exactly|let's stay|quick check)\b/.test(lower);

  return hasQuestionOrHint && (hasStageKeyword || hasInterviewerTone);
};

const extractGeminiText = (payload) => {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) return "";

  return parts
    .map((part) => String(part?.text || "").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
};

const normalizeModelContent = (value) => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
};

const resolveOpenRouterBaseUrl = () => {
  const value = String(openaiBaseUrl || "").trim();
  const isOpenRouterKey = String(openaiApiKey || "").startsWith("sk-or-");

  if (!value) return DEFAULT_OPENROUTER_BASE_URL;

  const normalized = value.replace(/\/+$/, "");
  const pointsToOpenAi = /api\.openai\.com/i.test(normalized);

  if (isOpenRouterKey && pointsToOpenAi) {
    return DEFAULT_OPENROUTER_BASE_URL;
  }

  return normalized;
};

const resolveOpenRouterModel = () => {
  const value = String(openaiModel || "").trim();
  return value || DEFAULT_OPENROUTER_MODEL;
};

const getOpenRouterClient = async () => {
  if (openRouterClientPromise) return openRouterClientPromise;

  openRouterClientPromise = import("@openrouter/sdk").then(({ OpenRouter }) =>
    new OpenRouter({
      apiKey: openaiApiKey,
      serverURL: resolveOpenRouterBaseUrl(),
    })
  );

  return openRouterClientPromise;
};

const generateWithGemini = async (prompt, options = {}) => {
  const maxOutputTokens = Number(options.maxOutputTokens) > 0 ? Number(options.maxOutputTokens) : 120;
  const trimmedBaseUrl = String(geminiBaseUrl || "").replace(/\/+$/, "");
  const endpoint = trimmedBaseUrl.endsWith("/models")
    ? `${trimmedBaseUrl}/${geminiModel}:generateContent`
    : `${trimmedBaseUrl}/models/${geminiModel}:generateContent`;

  const response = await axios.post(
    endpoint,
    {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: LLM_TEMPERATURE,
        topP: LLM_TOP_P,
        maxOutputTokens,
      },
    },
    {
      params: { key: geminiApiKey },
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 25000,
    }
  );
  return extractGeminiText(response.data);
};

const generateWithOpenAi = async (prompt, options = {}) => {
  const maxTokens = Number(options.maxTokens) > 0 ? Number(options.maxTokens) : 140;
  const openrouter = await getOpenRouterClient();
  const response = await openrouter.chat.send({
    chatRequest: {
      model: resolveOpenRouterModel(),
      messages: [{ role: "user", content: prompt }],
      temperature: LLM_TEMPERATURE,
      topP: LLM_TOP_P,
      maxTokens,
      stream: false,
    },
  });

  return normalizeModelContent(response?.choices?.[0]?.message?.content).trim();
};

const generateInterviewerMessage = async ({
  problemStatement,
  conversationHistory,
  currentStage,
  stageMastery,
  struggleCount,
  answerAssessment,
  latestUserAnswer,
  avoidQuestion,
  retryCount = 0,
  isSessionStart = false,
}) => {
  const providerErrors = [];

  const prompt = buildInterviewerPrompt({
    problemStatement: clampText(problemStatement, MAX_PROBLEM_CHARS),
    conversationHistory: clampText(conversationHistory, MAX_HISTORY_CHARS),
    currentStage,
    stageMastery,
    struggleCount,
    answerAssessment,
    latestUserAnswer,
    avoidQuestion,
  });

  if (!geminiApiKey && !openaiApiKey) {
    logger.warn("No API keys provided; falling back to default message.");
    return fallbackInterviewerMessage({
      isSessionStart,
      currentStage,
      stageMastery,
      struggleCount,
      answerAssessment,
      avoidQuestion,
      retryCount,
    });
  }

  if (openaiApiKey) {
    try {
      const message = await generateWithOpenAi(prompt);
      if (message) {
        const sanitized = sanitizeInterviewerMessage(message);
        if (isUsableInterviewerMessage({ message: sanitized, currentStage })) {
          return sanitized;
        }
        providerErrors.push("OpenAI returned low-quality content");
      } else {
        providerErrors.push("OpenAI returned empty content");
      }
    } catch (error) {
      providerErrors.push(error.response?.data?.error?.message || error.message);
    }
  }

  if (geminiApiKey) {
    try {
      const message = await generateWithGemini(prompt);
      if (message) {
        const sanitized = sanitizeInterviewerMessage(message);
        if (isUsableInterviewerMessage({ message: sanitized, currentStage })) {
          return sanitized;
        }
        providerErrors.push("Gemini returned low-quality content");
      } else {
        providerErrors.push("Gemini returned empty content");
      }
    } catch (error) {
      providerErrors.push(error.response?.data?.error?.message || error.message);
    }
  }

  logger.warn("Interview LLM call failed; using fallback", {
    error: providerErrors.join(" | ") || "No available provider",
  });

  return fallbackInterviewerMessage({
    isSessionStart,
    currentStage,
    stageMastery,
    struggleCount,
    answerAssessment,
    avoidQuestion,
    retryCount,
  });
};

const normalizeComplexityText = (value, fallback = "Unknown") => {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return fallback;
  if (/^(unknown|n\/?a|not sure|unclear|cannot determine|can't determine)$/i.test(text)) {
    return "Unknown";
  }

  return clampText(text, 90);
};

const parseJsonObject = (value) => {
  const text = String(value || "").trim();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    const first = text.indexOf("{");
    const last = text.lastIndexOf("}");
    if (first === -1 || last <= first) return null;
    try {
      return JSON.parse(text.slice(first, last + 1));
    } catch {
      return null;
    }
  }
};

const normalizeComplexityComparison = ({
  parsed,
  providedOptimalTime,
  providedOptimalSpace,
}) => {
  const safe = parsed && typeof parsed === "object" ? parsed : {};
  const userComplexity = safe.userComplexity && typeof safe.userComplexity === "object"
    ? safe.userComplexity
    : {};
  const optimalComplexity = safe.optimalComplexity && typeof safe.optimalComplexity === "object"
    ? safe.optimalComplexity
    : {};
  const comparison = safe.comparison && typeof safe.comparison === "object"
    ? safe.comparison
    : {};

  const normalizedProvidedTime = normalizeComplexityText(providedOptimalTime || "", "");
  const normalizedProvidedSpace = normalizeComplexityText(providedOptimalSpace || "", "");
  const hasProvidedOptimal = Boolean(normalizedProvidedTime || normalizedProvidedSpace);

  const verdictRaw = String(comparison.verdict || "").toLowerCase();
  const verdict = ["better", "equal", "worse", "unknown"].includes(verdictRaw)
    ? verdictRaw
    : "unknown";

  const confidenceValue = Number(userComplexity.confidence);
  const confidence = Number.isFinite(confidenceValue)
    ? Math.max(0, Math.min(1, confidenceValue))
    : 0;

  const userTime = normalizeComplexityText(userComplexity.time, "Unknown");
  const userSpace = normalizeComplexityText(userComplexity.space, "Unknown");
  const optimalTime = normalizedProvidedTime || normalizeComplexityText(optimalComplexity.time, "Unknown");
  const optimalSpace = normalizedProvidedSpace || normalizeComplexityText(optimalComplexity.space, "Unknown");

  const sourceRaw = String(optimalComplexity.source || "").toLowerCase();
  const source = hasProvidedOptimal
    ? "problem_data"
    : sourceRaw === "problem_data"
      ? "problem_data"
      : "ai_generated";

  return {
    userComplexity: {
      time: userTime,
      space: userSpace,
      confidence,
      rationale: clampText(userComplexity.rationale || "", 420),
    },
    optimalComplexity: {
      time: optimalTime,
      space: optimalSpace,
      source,
      rationale: clampText(optimalComplexity.rationale || "", 420),
    },
    comparison: {
      verdict,
      summary: clampText(comparison.summary || "", 420),
      recommendation: clampText(comparison.recommendation || "", 420),
    },
  };
};

const buildComplexityComparisonPrompt = ({
  problemStatement,
  editorialSolution,
  userSolution,
  providedOptimalTime,
  providedOptimalSpace,
}) => `You are an expert algorithm interviewer.

Task:
1) Infer the user's time and space complexity from their code/explanation.
2) Provide the optimal time and space complexity.
3) Compare user vs optimal.

Problem:
${problemStatement}

Editorial / reference (may be empty):
${editorialSolution || "N/A"}

User solution / explanation:
${userSolution}

Known optimal complexity from problem metadata:
- time: ${providedOptimalTime || "UNKNOWN"}
- space: ${providedOptimalSpace || "UNKNOWN"}

Rules:
- If problem metadata provides a non-UNKNOWN optimal time/space, keep that exact value.
- If user solution is unclear, mark user complexity as "Unknown" and confidence <= 0.35.
- Use standard Big-O notation like O(n), O(n log n), O(1).
- Be strict and realistic, do not assume the user is correct.

Return ONLY valid JSON with this exact shape:
{
  "userComplexity": {
    "time": "string",
    "space": "string",
    "confidence": 0.0,
    "rationale": "string"
  },
  "optimalComplexity": {
    "time": "string",
    "space": "string",
    "source": "problem_data|ai_generated",
    "rationale": "string"
  },
  "comparison": {
    "verdict": "better|equal|worse|unknown",
    "summary": "string",
    "recommendation": "string"
  }
}`;

const generateComplexityComparison = async ({
  problemStatement,
  editorialSolution,
  userSolution,
  providedOptimalTime,
  providedOptimalSpace,
}) => {
  const fallback = normalizeComplexityComparison({
    parsed: {
      userComplexity: {
        time: "Unknown",
        space: "Unknown",
        confidence: 0,
        rationale: "Could not reliably infer complexity from the provided answer.",
      },
      optimalComplexity: {
        time: providedOptimalTime || "Unknown",
        space: providedOptimalSpace || "Unknown",
        source: providedOptimalTime || providedOptimalSpace ? "problem_data" : "ai_generated",
        rationale:
          providedOptimalTime || providedOptimalSpace
            ? "Using complexity from problem metadata."
            : "Optimal complexity was not available in metadata.",
      },
      comparison: {
        verdict: "unknown",
        summary: "Unable to confidently compare user and optimal complexity.",
        recommendation:
          "Provide more concrete algorithm steps, loops, recursion depth, and auxiliary data structures.",
      },
    },
    providedOptimalTime,
    providedOptimalSpace,
  });

  if (!openaiApiKey && !geminiApiKey) {
    return fallback;
  }

  const prompt = buildComplexityComparisonPrompt({
    problemStatement: clampText(problemStatement, 5200),
    editorialSolution: clampText(editorialSolution, 3200),
    userSolution: clampText(userSolution, 5200),
    providedOptimalTime: normalizeComplexityText(providedOptimalTime || "", ""),
    providedOptimalSpace: normalizeComplexityText(providedOptimalSpace || "", ""),
  });

  const providerErrors = [];

  if (openaiApiKey) {
    try {
      const output = await generateWithOpenAi(prompt, { maxTokens: 360 });
      const parsed = parseJsonObject(output);
      if (parsed) {
        return normalizeComplexityComparison({
          parsed,
          providedOptimalTime,
          providedOptimalSpace,
        });
      }
      providerErrors.push("OpenAI returned non-JSON complexity output");
    } catch (error) {
      providerErrors.push(error.response?.data?.error?.message || error.message);
    }
  }

  if (geminiApiKey) {
    try {
      const output = await generateWithGemini(prompt, { maxOutputTokens: 360 });
      const parsed = parseJsonObject(output);
      if (parsed) {
        return normalizeComplexityComparison({
          parsed,
          providedOptimalTime,
          providedOptimalSpace,
        });
      }
      providerErrors.push("Gemini returned non-JSON complexity output");
    } catch (error) {
      providerErrors.push(error.response?.data?.error?.message || error.message);
    }
  }

  logger.warn("Complexity comparison generation failed; using fallback", {
    error: providerErrors.join(" | ") || "No available provider",
  });

  return fallback;
};

module.exports = {
  formatConversationHistory,
  buildInterviewerPrompt,
  generateInterviewerMessage,
  generateComplexityComparison,
};
