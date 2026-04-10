const axios = require("axios");
const { openaiApiKey, openaiBaseUrl, openaiModel } = require("../config/env");
const logger = require("../utils/logger");

const MAX_PROBLEM_CHARS = 4200;
const MAX_HISTORY_CHARS = 3200;
const MAX_RESPONSE_CHARS = 320;

const clampText = (text = "", maxChars = 1000) => {
  const value = String(text || "").trim();
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}...`;
};

const formatConversationHistory = (messages = [], maxMessages = 6) => {
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
  struggleCount,
  answerAssessment,
  avoidQuestion,
}) => `You are a senior technical interviewer at a top tech company.

You are conducting a LIVE coding interview.

You are NOT a tutor.
You are NOT a teacher.
You are a HUMAN interviewer.

-------------------------------------

Problem:
${problemStatement}

Conversation so far:
${conversationHistory}

Current stage:
${currentStage}

User struggle level:
${struggleCount}

Current user answer quality:
${answerAssessment}

-------------------------------------

BEHAVIOR:

1. Speak naturally:
   - 'hmm', 'okay', 'interesting', 'not quite', 'right'
   - slightly conversational, not robotic

2. ALWAYS react first:
   - good -> 'yeah, that makes sense'
   - partial -> 'you're close...'
   - wrong -> 'hmm, not exactly...'
   - no answer -> 'that's okay, let's think about it'

3. NEVER repeat questions.

4. Ask ONE thing at a time.

5. Keep responses SHORT (1-2 lines).

-------------------------------------

ADAPTIVE LOGIC:

If user struggles:
- 1st attempt -> small hint
- 2nd attempt -> clearer hint
- 3rd attempt -> move forward

If user says:
- 'no'
- 'that's all'
-> challenge lightly OR move forward

-------------------------------------

INTERVIEW FLOW:

Approach -> Complexity -> Edge Cases -> Optimization -> Coding

DO NOT mention stages explicitly.

-------------------------------------

QUESTION STYLE:

Avoid generic robotic wording.
Use natural prompts like:
- "hmm... what happens if the input is empty?"
- "what if there are duplicates?"
- "does this still work for large inputs?"

${avoidQuestion ? `Do not repeat this question or wording: ${avoidQuestion}` : ""}

-------------------------------------

OUTPUT:
Return ONLY the next interviewer message.
No explanations.
No formatting.`;

const reactionMap = {
  correct: "yeah, that makes sense.",
  partial: "you're close, think about this:",
  wrong: "hmm, not exactly...",
  no_answer: "that's okay, let's think about it.",
};

const stageFallbackQuestions = {
  approach: [
    "okay, what approach would you start with here?",
    "hmm, what core idea are you going with first?",
  ],
  complexity: [
    "interesting, what does the time and space complexity look like?",
    "right, what Big-O cost do you expect here?",
  ],
  edge_cases: [
    "hmm, what happens if the input is empty?",
    "okay, what if there are duplicates or very large inputs?",
  ],
  optimization: [
    "right, can you optimize this further?",
    "interesting, any trade-off to reduce memory or runtime?",
  ],
  coding: [
    "okay, how would you structure the code now?",
    "right, what checks would you keep while implementing?",
  ],
};

const stageHintPrompts = {
  approach: {
    small: "small hint: focus on what data you need at each step.",
    clear: "clearer hint: think about a structure that gives fast lookup.",
  },
  complexity: {
    small: "small hint: count work per element and extra storage.",
    clear: "clearer hint: walk through one pass and track memory growth.",
  },
  edge_cases: {
    small: "small hint: try empty, single, duplicate, and large inputs.",
    clear: "clearer hint: include boundary values and repeated elements.",
  },
  optimization: {
    small: "small hint: check if a different traversal reduces overhead.",
    clear: "clearer hint: consider trade-offs between memory and passes.",
  },
  coding: {
    small: "small hint: define invariants before writing loops.",
    clear: "clearer hint: lock down update order and guard conditions first.",
  },
};

const fallbackInterviewerMessage = ({
  isSessionStart,
  currentStage = "approach",
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
    .trim();

  const maxCharsMessage = clampText(cleaned, MAX_RESPONSE_CHARS);
  const maxLinesMessage = maxCharsMessage
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join("\n");

  const singleAskMessage = enforceSingleAsk(maxLinesMessage);
  return singleAskMessage || "hmm, can you walk me through your next step?";
};

const generateInterviewerMessage = async ({
  problemStatement,
  conversationHistory,
  currentStage,
  struggleCount,
  answerAssessment,
  avoidQuestion,
  retryCount = 0,
  isSessionStart = false,
}) => {
  const prompt = buildInterviewerPrompt({
    problemStatement: clampText(problemStatement, MAX_PROBLEM_CHARS),
    conversationHistory: clampText(conversationHistory, MAX_HISTORY_CHARS),
    currentStage,
    struggleCount,
    answerAssessment,
    avoidQuestion,
  });

  if (!openaiApiKey) {
    return fallbackInterviewerMessage({
      isSessionStart,
      currentStage,
      struggleCount,
      answerAssessment,
      avoidQuestion,
      retryCount,
    });
  }

  try {
    const response = await axios.post(
      `${openaiBaseUrl}/chat/completions`,
      {
        model: openaiModel,
        temperature: 0.35,
        max_tokens: 120,
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );

    const message = response.data?.choices?.[0]?.message?.content;
    return sanitizeInterviewerMessage(message);
  } catch (error) {
    logger.warn("Interview LLM call failed; using fallback", {
      error: error.response?.data?.error?.message || error.message,
    });
    return fallbackInterviewerMessage({
      isSessionStart,
      currentStage,
      struggleCount,
      answerAssessment,
      avoidQuestion,
      retryCount,
    });
  }
};

module.exports = {
  formatConversationHistory,
  buildInterviewerPrompt,
  generateInterviewerMessage,
};
