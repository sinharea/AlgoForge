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
}) => `You are a technical interviewer at a top tech company.

You are NOT a tutor.
You are NOT a teacher.
You are a HUMAN interviewer.

Problem:
${problemStatement}

Conversation so far:
${conversationHistory}

Current stage:
${currentStage}

User struggle level:
${struggleCount}

User answer quality:
${answerAssessment}

PERSONALITY:
- Speak naturally like a human
- Use short conversational phrases:
  - "hmm"
  - "okay"
  - "interesting"
  - "that makes sense"
  - "not quite"
- Do NOT sound robotic or structured

STRICT RULES:
- NEVER repeat the same question
- ALWAYS move the conversation forward
- If user already answered something, acknowledge briefly and continue

BEHAVIOR RULES:
1. React to the user's answer FIRST:
   - Good answer -> "yeah, that makes sense"
   - Partial -> "you're close, think about..."
   - Wrong -> "hmm, not exactly..."
   - No answer -> "that's okay, let's think about it together"

2. If user struggles:
   - First: give a SMALL hint
   - Second: give a clearer hint
   - Third: move forward

3. DO NOT dump full explanations

4. Keep responses SHORT (1-2 lines max)

Interview Flow (must follow in order):
1. Approach
2. Time & Space Complexity
3. Edge Cases
4. Optimization
5. Coding Discussion

Do not explicitly mention stage names.

${avoidQuestion ? `Do not ask this again: ${avoidQuestion}` : ""}

Output:
- Only the next interviewer message.`;

const stageFallbackQuestions = {
  approach: [
    "okay, what approach would you start with here?",
    "hmm, what core idea are you leaning toward first?",
  ],
  complexity: [
    "yeah, that makes sense. what would the time and space complexity look like?",
    "interesting. can you estimate the Big-O costs here?",
  ],
  edge_cases: [
    "hmm, can you think of tricky cases that might break this?",
    "okay, what happens on empty input or duplicate-heavy input?",
  ],
  optimization: [
    "that makes sense. any optimization you'd try if input grows a lot?",
    "not bad. can we trim memory or runtime further?",
  ],
  coding: [
    "okay, walk me through how you'd structure the code.",
    "interesting. what checks would you keep while implementing?",
  ],
};

const fallbackInterviewerMessage = ({
  isSessionStart,
  currentState,
  currentStage = "approach",
  struggleCount = 0,
  answerAssessment = "partial",
  avoidQuestion,
  retryCount = 0,
}) => {
  const stage = stageFallbackQuestions[currentStage] ? currentStage : "approach";
  const stagePrompts = stageFallbackQuestions[stage];
  const preferred = stagePrompts[retryCount % stagePrompts.length];

  const reactionMap = {
    correct: "yeah, that makes sense.",
    partial: "you're close, think about this:",
    wrong: "hmm, not exactly...",
    no_answer: "that's okay, let's think about it together.",
  };

  const reaction = reactionMap[answerAssessment] || reactionMap.partial;

  if (struggleCount >= 3) {
    return `${reaction} let's move on - ${preferred}`;
  }

  if (struggleCount === 2) {
    return `${reaction} clearer hint: focus on what stays true after each step.`;
  }

  if (struggleCount === 1 || currentState?.userStuck || (currentState?.stuckCount || 0) >= 2) {
    return `${reaction} small hint: think about the key invariant first.`;
  }

  if (isSessionStart && stage === "approach") {
    return preferred;
  }

  if (avoidQuestion && preferred.toLowerCase() === String(avoidQuestion).toLowerCase()) {
    return stagePrompts[(retryCount + 1) % stagePrompts.length];
  }

  return `${reaction} ${preferred}`;
};

const sanitizeInterviewerMessage = (content) => {
  const cleaned = String(content || "")
    .replace(/^Interviewer:\s*/i, "")
    .replace(/^Next interviewer message:\s*/i, "")
    .replace(/^Only the next interviewer message\.?\s*/i, "")
    .trim();

  const maxCharsMessage = clampText(cleaned, MAX_RESPONSE_CHARS);
  const maxLinesMessage = maxCharsMessage
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join("\n");

  return maxLinesMessage || "hmm, can you walk me through your next step?";
};

const generateInterviewerMessage = async ({
  problemStatement,
  conversationHistory,
  currentStage,
  struggleCount,
  answerAssessment,
  avoidQuestion,
  currentState,
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
      currentState,
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
      currentState,
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
