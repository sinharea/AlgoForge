const InterviewSession = require("../models/InterviewSession");
const Problem = require("../models/Problem");
const ApiError = require("../utils/apiError");
const mongoose = require("mongoose");
const { interviewLastNChats, interviewChatPageSize } = require("../config/env");
const { judgeSubmission } = require("./executionService");
const {
  formatConversationHistory,
  generateInterviewerMessage,
  generateComplexityComparison,
  generateAdversarialTestCases,
} = require("./interviewLlmService");

const STUCK_PATTERN = /\b(stuck|hint|help|confused|no idea|don't know|dont know|unclear)\b/i;
const NO_ANSWER_PATTERN = /\b(idk|i don't know|dont know|no idea|not sure|skip|pass)\b/i;
const END_SIGNAL_PATTERN = /^(no|nope|that's all|thats all|nothing else)$/i;
const SKIP_REQUEST_PATTERN = /\b(skip|pass|move on|next question|next stage|go next|can we skip|can we move on|let'?s move on)\b/i;
const SKIP_CONFIRM_PATTERN = /(^|\b)(yes\s*skip|confirm\s*skip|skip\s*it|yes\s*move\s*on|please\s*skip|skip\s*this|yes|yeah|sure|ok|okay)(\b|$)/i;
const SKIP_CANCEL_PATTERN = /(^|\b)(no\s*skip|don't\s*skip|dont\s*skip|no\s*move\s*on|continue|let'?s\s*continue|wait|hold\s*on|no)(\b|$)/i;
const OFF_TOPIC_PATTERN = /\b(who are you|what are you|your name|hello|hi\b|hey\b|hlo\b|hii\b|how are you|thanks|thank you|bye|good morning|good night)\b/i;
const INTERVIEW_STAGES = ["approach", "complexity", "edge_cases", "optimization", "coding"];

const APPROACH_PATTERN = /\b(linked\s*list|pointer|two[-\s]?pointer|prev|curr|next|in[-\s]?place|recurs|iterat|hash|map|set|array|sliding\s+window|binary\s+search|dp|dynamic\s+programming|greedy|stack|queue|graph|sort|prefix|backtrack|brute)\b/i;
const COMPLEXITY_PATTERN = /\b(o\s*\(|time\s*complexity|space\s*complexity|linear|log\s*n|quadratic|constant\s*space|n\s*log\s*n|n\^2|n\^3|2\^n|e\^n)\b/i;
const EDGE_PATTERN = /\b(edge|corner|empty|null|single|duplicate|negative|zero|overflow|boundary|large\s*input|one\s*element)\b/i;
const OPTIMIZATION_PATTERN = /\b(optimi[sz]e|improv|reduce|trade[-\s]?off|cache|memo|in[-\s]?place|precompute|early\s*exit|prune)\b/i;
const CODING_PATTERN = /\b(code|implement|function|loop|iterate|condition|if\s*\(|pseudo|variable|syntax|compile)\b/i;
const UNCERTAINTY_PATTERN = /\b(maybe|perhaps|probably|guess|might|could be|i think|can i|should i)\b/i;
const REASONING_PATTERN = /\b(because|since|therefore|so that|first|then|next|while|by)\b/i;
const MIN_DETAILED_TOKENS = 9;
const HINT_PATTERN = /\b(hint|consider|think about|try|focus on|could you)\b/i;

const REACTION_BY_ASSESSMENT = {
  correct: "nice, that tracks.",
  partial: "good direction. quick tweak:",
  wrong: "i see what you're trying, but not quite.",
  no_answer: "no worries, let's keep it simple.",
};

const LEADING_REACTION_PATTERN = /^(yeah,?\s*that makes sense|yeah|yes|yep|good|great|exactly|correct|right|that makes sense|nice,?\s*that tracks|nice|you're close,?\s*think about this:?|you're close|good direction,?\s*quick tweak:?|good direction|hmm,?\s*not exactly|not quite|i see what you're trying,?\s*but not quite|i see your direction,?\s*but not quite|that's okay,?\s*let'?s think about it|that's okay|no worries,?\s*let'?s keep it simple|no worries|no stress,?\s*let'?s take it step by step|no stress|no problem)[\s,.:!-]*/i;

const stripLeadingReaction = (value = "") =>
  String(value || "")
    .replace(LEADING_REACTION_PATTERN, "")
    .trim();

const trimText = (value = "", max = 1200) => {
  const text = String(value || "").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
};

const normalizeStage = (stage) =>
  INTERVIEW_STAGES.includes(stage) ? stage : "approach";

const nextStage = (stage) => {
  const current = normalizeStage(stage);
  const index = INTERVIEW_STAGES.indexOf(current);
  if (index < 0 || index >= INTERVIEW_STAGES.length - 1) return INTERVIEW_STAGES[INTERVIEW_STAGES.length - 1];
  return INTERVIEW_STAGES[index + 1];
};

const normalizeForSimilarity = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isTooSimilar = (currentText = "", previousText = "") => {
  const a = normalizeForSimilarity(currentText);
  const b = normalizeForSimilarity(previousText);
  if (!a || !b) return false;

  if (a === b) return true;
  if (a.length > 24 && (a.includes(b) || b.includes(a))) return true;

  const aTokens = new Set(a.split(" "));
  const bTokens = new Set(b.split(" "));
  const intersection = [...aTokens].filter((token) => bTokens.has(token)).length;
  const union = new Set([...aTokens, ...bTokens]).size || 1;
  return intersection / union >= 0.78;
};

const isTooSimilarToAny = (currentText = "", previousTexts = []) =>
  previousTexts.filter(Boolean).some((text) => isTooSimilar(currentText, text));

const enforceTwoLines = (value = "") =>
  String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join("\n");

const ensureReactionPrefix = (message, assessment) => {
  const text = String(message || "").trim();
  const expectedReaction = REACTION_BY_ASSESSMENT[assessment] || REACTION_BY_ASSESSMENT.partial;
  if (!text) return expectedReaction;

  const startsPositive = /^(yeah|yes|yep|good|great|exactly|correct|right|that makes sense|nice)\b/i.test(text);
  const startsPartial = /^(you're close|good direction)\b/i.test(text);
  const startsWrong = /^(hmm|not quite|i don't think|that doesn't seem right|i see what you're trying|i see your direction)\b/i.test(text);
  const startsNoAnswer = /^(that's okay|no worries|no stress|no problem)\b/i.test(text);

  if (assessment === "correct" && startsPositive) return text;
  if (assessment === "partial" && startsPartial) return text;
  if (assessment === "wrong" && startsWrong) return text;
  if (assessment === "no_answer" && startsNoAnswer) return text;

  const body = stripLeadingReaction(text);
  return `${expectedReaction} ${body}`.trim();
};

const stageFallbackQuestion = (
  stage,
  assessment = "partial",
  struggleCount = 0,
  isEndSignal = false,
  stageMastery = 0
) => {
  const reaction = REACTION_BY_ASSESSMENT[assessment] || REACTION_BY_ASSESSMENT.partial;

  if (isEndSignal && struggleCount < 1) {
    const challenge = {
      approach: "quick one: what core idea would you still try first?",
      complexity: "quick check: what complexity do you expect here?",
      edge_cases: "quick check: what tricky case comes to mind first?",
      optimization: "quick check: any optimization you would test?",
      coding: "quick check: how would you structure the code?",
    };
    return `${reaction} ${challenge[normalizeStage(stage)] || challenge.approach}`;
  }

  if (struggleCount === 1) {
    return `${reaction} small hint: focus on the key invariant in your approach.`;
  }

  if (struggleCount === 2) {
    return `${reaction} clearer hint: track what information must be available before each decision.`;
  }

  if (stageMastery >= 1 && struggleCount === 0) {
    const deepFollowUps = {
      approach: "nice start. what would make this approach fail, and how would you guard against it?",
      complexity: "good. where exactly does your biggest cost come from in this approach?",
      edge_cases: "good catch. which one edge case is most likely to break your first implementation?",
      optimization: "solid. if you had to optimize only one bottleneck first, which one would you pick?",
      coding: "good structure. what invariant will you maintain inside your main loop?",
    };
    return `${reaction} ${deepFollowUps[normalizeStage(stage)] || deepFollowUps.approach}`;
  }

  const prompts = {
    approach: "okay, what approach would you start with here, and what's your intuition?",
    complexity: "interesting. what would the time and space complexity be?",
    edge_cases: "hmm, any tricky inputs that could break this?",
    optimization: "that makes sense. can this be optimized further?",
    coding: "okay, walk me through how you'd structure the implementation.",
  };

  return `${reaction} ${prompts[normalizeStage(stage)] || prompts.approach}`;
};

const stageRedirectQuestion = (stage) => {
  const prompts = {
    approach: "Let's stay on the problem. What's your approach and intuition?",
    complexity: "Let's stay on the problem. What are the time and space complexities?",
    edge_cases: "Let's stay on the problem. Which edge cases could break your approach?",
    optimization: "Let's stay on the problem. What optimization would you try next?",
    coding: "Let's stay on the problem. How would you structure the implementation?",
  };

  return prompts[normalizeStage(stage)] || prompts.approach;
};

const stageLabel = (stage) => normalizeStage(stage).replace("_", " ");

const humanOffTopicResponse = (stage, userMessage = "") => {
  const prompt = stageRedirectQuestion(stage);
  const text = String(userMessage || "").toLowerCase();

  if (/\b(thanks|thank you)\b/.test(text)) {
    return `you're welcome. ${prompt}`;
  }

  if (/\b(how are you|how's it going|hows it going)\b/.test(text)) {
    return `doing well, thanks. ${prompt}`;
  }

  if (/\b(hi|hello|hey)\b/.test(text)) {
    return `hey, good to see you. ${prompt}`;
  }

  if (/\b(who are you|your name|what are you)\b/.test(text)) {
    return `i'm your mock interviewer for this round. ${prompt}`;
  }

  return `fair point. ${prompt}`;
};

const assessUserResponse = ({ stage, userMessage }) => {
  const text = String(userMessage || "").trim();
  if (!text) return "no_answer";
  if (NO_ANSWER_PATTERN.test(text)) return "no_answer";
  if (STUCK_PATTERN.test(text)) return "wrong";

  const tokenCount = text.split(/\s+/).filter(Boolean).length;
  const isLowSignal = tokenCount <= 3 || text.length < 10;
  const isMetaConfirmation = /\b(correct|right|okay|fine|yes|no)\b/i.test(text) && tokenCount <= 5;
  const hasUncertainty = UNCERTAINTY_PATTERN.test(text);
  const hasReasoning = REASONING_PATTERN.test(text);

  const patternByStage = {
    approach: APPROACH_PATTERN,
    complexity: COMPLEXITY_PATTERN,
    edge_cases: EDGE_PATTERN,
    optimization: OPTIMIZATION_PATTERN,
    coding: CODING_PATTERN,
  };

  const pattern = patternByStage[normalizeStage(stage)] || APPROACH_PATTERN;
  const hasStageSignal = pattern.test(text);

  if (isLowSignal || isMetaConfirmation) {
    return hasStageSignal ? "partial" : "no_answer";
  }

  if (hasStageSignal && !hasUncertainty) {
    return "correct";
  }

  if (hasStageSignal && hasUncertainty) {
    return "partial";
  }

  if (tokenCount >= MIN_DETAILED_TOKENS && hasReasoning) {
    return "partial";
  }

  return "wrong";
};

const formatProblemStatement = (problem) => {
  const samples = (problem.sampleTestCases || [])
    .slice(0, 2)
    .map((sample, idx) => `Sample ${idx + 1} Input: ${sample.input || "(empty)"}\nSample ${idx + 1} Output: ${sample.expectedOutput || "(empty)"}`)
    .join("\n\n");

  return [
    `Title: ${problem.title}`,
    `Difficulty: ${problem.difficulty}`,
    `Tags: ${(problem.tags || []).join(", ") || "N/A"}`,
    "Description:",
    trimText(problem.description || "", 2200),
    "Constraints:",
    trimText(problem.constraints || "N/A", 800),
    "Samples:",
    trimText(samples || "N/A", 900),
  ].join("\n\n");
};

const formatProblemForComplexityComparison = (problem) => {
  const optimalTime = String(problem?.optimalComplexity?.time || "").trim();
  const optimalSpace = String(problem?.optimalComplexity?.space || "").trim();
  const optimalNotes = String(problem?.optimalComplexity?.notes || "").trim();

  return [
    `Title: ${problem.title}`,
    `Difficulty: ${problem.difficulty}`,
    `Tags: ${(problem.tags || []).join(", ") || "N/A"}`,
    "Description:",
    trimText(problem.description || "", 2600),
    "Constraints:",
    trimText(problem.constraints || "N/A", 1000),
    "Optimal complexity metadata:",
    `Time: ${optimalTime || "Unknown"}`,
    `Space: ${optimalSpace || "Unknown"}`,
    `Notes: ${optimalNotes || "N/A"}`,
  ].join("\n\n");
};

const normalizeComplexityValue = (value, fallback = "Unknown") => {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return fallback;
  return text.length > 90 ? `${text.slice(0, 90)}...` : text;
};

const COMPLEXITY_LEVELS = [
  { label: "O(1)", patterns: [/o\(\s*1\s*\)/i, /\bconstant\b/i] },
  { label: "O(log n)", patterns: [/o\(\s*log\s*n\s*\)/i, /\blog\s*n\b/i, /\blogarith/i] },
  { label: "O(n)", patterns: [/o\(\s*n\s*\)/i, /\blinear\b/i] },
  { label: "O(n log n)", patterns: [/o\(\s*n\s*log\s*n\s*\)/i, /\bn\s*log\s*n\b/i] },
  { label: "O(n^2)", patterns: [/o\(\s*n\s*\^\s*2\s*\)/i, /\bo\(\s*n2\s*\)/i, /\bquadratic\b/i] },
  { label: "O(n^3)", patterns: [/o\(\s*n\s*\^\s*3\s*\)/i, /\bcubic\b/i] },
  { label: "O(2^n)", patterns: [/o\(\s*2\s*\^\s*n\s*\)/i, /\bexponential\b/i] },
];

const extractComplexityLabel = (text = "") => {
  const value = String(text || "");
  if (!value.trim()) return null;

  for (const complexity of COMPLEXITY_LEVELS) {
    if (complexity.patterns.some((pattern) => pattern.test(value))) {
      return complexity.label;
    }
  }

  return null;
};

const complexityRank = (label = "") => {
  const normalized = String(label || "").trim();
  const order = {
    "O(1)": 1,
    "O(log n)": 2,
    "O(n)": 3,
    "O(n log n)": 4,
    "O(n^2)": 5,
    "O(n^3)": 6,
    "O(2^n)": 7,
  };

  return order[normalized] ?? null;
};

const inferComplexityFromMessages = (messages = []) => {
  const userMessages = (messages || [])
    .filter((message) => message.role === "user")
    .map((message) => String(message.content || "").trim())
    .filter(Boolean)
    .reverse();

  for (const message of userMessages) {
    const label = extractComplexityLabel(message);
    if (label) return label;
  }

  return null;
};

const inferComplexityFromCode = (code = "") => {
  const snippet = String(code || "");
  if (!snippet.trim()) return null;

  const explicitComplexity = extractComplexityLabel(snippet);
  if (explicitComplexity) return explicitComplexity;

  const loopPattern = /\b(for|while)\b/gi;
  const loopCount = (snippet.match(loopPattern) || []).length;
  const hasTripleNestedLoop = /(for|while)[\s\S]{0,220}(for|while)[\s\S]{0,220}(for|while)/i.test(snippet);
  const hasDoubleNestedLoop = /(for|while)[\s\S]{0,160}(for|while)/i.test(snippet);

  if (hasTripleNestedLoop) return "O(n^3)";
  if (hasDoubleNestedLoop) return "O(n^2)";
  if (loopCount >= 1) return "O(n)";
  return "O(1)";
};

const scoreOptimalityFromSignals = ({
  targetComplexity,
  explanationComplexity,
  codeComplexity,
  stageIndex,
}) => {
  const targetRank = complexityRank(extractComplexityLabel(targetComplexity || "") || "");
  const explanationRank = complexityRank(explanationComplexity || "");
  const codeRank = complexityRank(codeComplexity || "");
  const observed = [explanationRank, codeRank].filter((value) => Number.isFinite(value));

  if (Number.isFinite(targetRank) && observed.length > 0) {
    const avgDiff =
      observed.reduce((sum, value) => sum + Math.abs(value - targetRank), 0) /
      observed.length;

    if (avgDiff <= 0.5) return 22;
    if (avgDiff <= 1.5) return 16;
    if (avgDiff <= 2.5) return 10;
    return 6;
  }

  if (observed.length === 2) return 14;
  if (observed.length === 1) return stageIndex >= 1 ? 10 : 7;
  return stageIndex >= 1 ? 8 : 5;
};

const getRecentUserSolution = (messages = [], maxMessages = 5) => {
  const recentUserMessages = messages
    .filter((message) => message.role === "user")
    .slice(-maxMessages)
    .map((message) => String(message.content || "").trim())
    .filter(Boolean);

  return recentUserMessages.join("\n\n").trim();
};

const hasMeaningfulCodeSnapshot = (snapshot) => {
  const code = String(snapshot?.code || "").trim();
  if (code.length < 24) return false;

  const hasProgrammingSignal =
    /(function|def\s+|class\s+|for\s*\(|while\s*\(|if\s*\(|=>|return\s+|public\s+|private\s+|let\s+|const\s+|var\s+)/i.test(
      code
    );

  return hasProgrammingSignal || code.split(/\r?\n/).filter(Boolean).length >= 4;
};

const latestCodeSnapshotText = (codeSnapshots = []) => {
  const latest =
    Array.isArray(codeSnapshots) && codeSnapshots.length > 0
      ? codeSnapshots[codeSnapshots.length - 1]
      : null;

  if (!latest || !hasMeaningfulCodeSnapshot(latest)) {
    return "";
  }

  return trimText(String(latest.code || ""), 1600);
};

const MAX_COMPLEXITY_HISTORY = 20;

const mapComplexitySnapshot = (snapshot) => {
  if (!snapshot) return null;

  return {
    userSolution: normalizeComplexityValue(snapshot.userSolution, ""),
    userComplexity: {
      time: normalizeComplexityValue(snapshot.userComplexity?.time),
      space: normalizeComplexityValue(snapshot.userComplexity?.space),
      confidence: Number(snapshot.userComplexity?.confidence || 0),
      rationale: normalizeComplexityValue(snapshot.userComplexity?.rationale, ""),
    },
    optimalComplexity: {
      time: normalizeComplexityValue(snapshot.optimalComplexity?.time),
      space: normalizeComplexityValue(snapshot.optimalComplexity?.space),
      source:
        snapshot.optimalComplexity?.source === "problem_data"
          ? "problem_data"
          : "ai_generated",
      rationale: normalizeComplexityValue(snapshot.optimalComplexity?.rationale, ""),
    },
    comparison: {
      verdict: ["better", "equal", "worse", "unknown"].includes(snapshot.comparison?.verdict)
        ? snapshot.comparison.verdict
        : "unknown",
      summary: normalizeComplexityValue(snapshot.comparison?.summary, ""),
      recommendation: normalizeComplexityValue(snapshot.comparison?.recommendation, ""),
    },
    createdAt: snapshot.createdAt,
  };
};

const MAX_CHAT_PAGE_SIZE = 100;

const resolvePageSize = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return Math.min(interviewChatPageSize, MAX_CHAT_PAGE_SIZE);
  }
  return Math.min(parsed, MAX_CHAT_PAGE_SIZE);
};

const resolveBeforeIndex = (value, totalMessages) => {
  if (value === undefined || value === null || value === "") {
    return totalMessages;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return totalMessages;
  }

  if (parsed <= 0) return 0;
  if (parsed >= totalMessages) return totalMessages;
  return parsed;
};

const paginateMessages = (messages = [], { beforeIndex, limit } = {}) => {
  const totalMessages = Array.isArray(messages) ? messages.length : 0;
  const pageSize = resolvePageSize(limit);
  const resolvedBeforeIndex = resolveBeforeIndex(beforeIndex, totalMessages);

  const startIndex = Math.max(resolvedBeforeIndex - pageSize, 0);
  const endIndex = resolvedBeforeIndex;
  const chunk = messages.slice(startIndex, endIndex);

  return {
    messages: chunk,
    pagination: {
      total: totalMessages,
      pageSize,
      startIndex,
      endIndex,
      hasMore: startIndex > 0,
      nextBeforeIndex: startIndex > 0 ? startIndex : null,
    },
  };
};

const toSessionResponse = (session, problem, pageOptions = {}) => {
  const paged = paginateMessages(session.messages, pageOptions);
  const latestComplexityComparison =
    session.complexityComparisons?.length > 0
      ? mapComplexitySnapshot(session.complexityComparisons[session.complexityComparisons.length - 1])
      : null;

  return {
    sessionId: session._id,
    problem: {
      id: problem._id,
      title: problem.title,
      slug: problem.slug,
      difficulty: problem.difficulty,
    },
    messages: paged.messages,
    pagination: paged.pagination,
    latestComplexityComparison,
    currentStage: normalizeStage(session.currentStage || session.currentState?.currentStage),
    currentState: session.currentState,
    createdAt: session.createdAt,
  };
};

const startInterviewSession = async ({ userId, problemId }) => {
  const problem = await Problem.findById(problemId)
    .select("title slug difficulty tags description constraints sampleTestCases")
    .lean();

  if (!problem) {
    throw ApiError.notFound("Problem not found");
  }

  const currentState = {
    phase: "active",
    hintsGiven: 0,
    stuckCount: 0,
    struggleCount: 0,
    skipCount: 0,
    skipPenalty: 0,
    pendingSkipConfirmation: false,
    pendingSkipStage: "",
    pendingSkipAskedAtTurn: 0,
    stageMastery: 0,
    userStuck: false,
    turn: 1,
    lastInterviewerQuestion: "",
  };

  const currentStage = "approach";

  const firstMessageContent = await generateInterviewerMessage({
    problemStatement: formatProblemStatement(problem),
    conversationHistory: "No prior messages yet.",
    currentStage,
    stageMastery: 0,
    struggleCount: 0,
    answerAssessment: "no_answer",
    latestUserAnswer: "",
    isSessionStart: true,
  });

  const session = await InterviewSession.create({
    userId,
    problemId: problem._id,
    messages: [
      {
        role: "interviewer",
        content: firstMessageContent,
        timestamp: new Date(),
      },
    ],
    currentStage,
    currentState,
  });

  session.currentState.lastInterviewerQuestion = firstMessageContent;
  await session.save();

  return {
    ...toSessionResponse(session, problem, {
      limit: interviewChatPageSize,
    }),
    firstMessage: session.messages[0],
  };
};

const respondInterviewSession = async ({ userId, sessionId, userMessage }) => {
  const session = await InterviewSession.findById(sessionId).populate(
    "problemId",
    "title slug difficulty tags description constraints sampleTestCases"
  );

  if (!session) {
    throw ApiError.notFound("Interview session not found");
  }

  if (String(session.userId) !== String(userId)) {
    throw ApiError.forbidden("You can only access your own interview sessions");
  }

  const normalizedMessage = String(userMessage || "").trim();
  if (!normalizedMessage) {
    throw ApiError.badRequest("userMessage is required");
  }
  const lowerNormalizedMessage = normalizedMessage.toLowerCase();

  const resolvedCurrentStage = normalizeStage(
    session.currentStage || session.currentState?.currentStage || "approach"
  );
  const isOffTopic = OFF_TOPIC_PATTERN.test(lowerNormalizedMessage);
  const latestCodeContext = latestCodeSnapshotText(session.codeSnapshots || []);
  const hasCodeContext = Boolean(latestCodeContext);

  let answerAssessment = assessUserResponse({
    stage: resolvedCurrentStage,
    userMessage: normalizedMessage,
  });

  // If editor code exists but message is short, avoid treating the candidate as having no approach.
  if (!isOffTopic && answerAssessment === "no_answer" && hasCodeContext && resolvedCurrentStage === "approach") {
    answerAssessment = "partial";
  }

  const isEndSignal = END_SIGNAL_PATTERN.test(lowerNormalizedMessage);
  const hasPendingSkipConfirmation =
    Boolean(session.currentState?.pendingSkipConfirmation) &&
    (session.currentState?.pendingSkipStage || resolvedCurrentStage) === resolvedCurrentStage;
  const wantsSkipStage = !isOffTopic && SKIP_REQUEST_PATTERN.test(lowerNormalizedMessage);
  const confirmsSkipStage =
    hasPendingSkipConfirmation && SKIP_CONFIRM_PATTERN.test(lowerNormalizedMessage);
  const cancelsSkipStage =
    hasPendingSkipConfirmation &&
    (SKIP_CANCEL_PATTERN.test(lowerNormalizedMessage) ||
      answerAssessment === "correct" ||
      answerAssessment === "partial" ||
      answerAssessment === "wrong");

  const shouldAskSkipConfirmation = wantsSkipStage && !hasPendingSkipConfirmation;
  const shouldRepeatSkipConfirmation =
    hasPendingSkipConfirmation && !confirmsSkipStage && !cancelsSkipStage;
  const shouldSkipStage = !isOffTopic && confirmsSkipStage;
  const isSkipHandshakeTurn =
    !isOffTopic && (shouldAskSkipConfirmation || shouldRepeatSkipConfirmation);

  const messageSignalsStuck = STUCK_PATTERN.test(normalizedMessage);
  const isStruggleResponse =
    !isOffTopic &&
    !isSkipHandshakeTurn &&
    (messageSignalsStuck || answerAssessment === "wrong" || answerAssessment === "no_answer");

  let nextStuckCount = isStruggleResponse
    ? (session.currentState?.struggleCount ?? session.currentState?.stuckCount ?? 0) + 1
    : Math.max(0, (session.currentState?.struggleCount ?? session.currentState?.stuckCount ?? 0) - 1);

  const currentSkipCount = Number(session.currentState?.skipCount || 0);
  const currentSkipPenalty = Number(session.currentState?.skipPenalty || 0);
  const nextSkipCount = shouldSkipStage ? currentSkipCount + 1 : currentSkipCount;
  const nextSkipPenalty = shouldSkipStage
    ? Math.min(currentSkipPenalty + 4, 25)
    : currentSkipPenalty;

  const currentStageMastery = Number(session.currentState?.stageMastery || 0);
  let nextStageMastery = currentStageMastery;
  const isProductiveResponse =
    answerAssessment === "correct" || answerAssessment === "partial";

  if (!isOffTopic && !isSkipHandshakeTurn) {
    if (answerAssessment === "correct") {
      // A confident stage answer should advance promptly.
      nextStageMastery = Math.min(currentStageMastery + 2, 2);
    } else if (answerAssessment === "partial") {
      // Partial-but-relevant answers still indicate progress.
      nextStageMastery = Math.min(currentStageMastery + 1, 2);
    } else if (answerAssessment === "wrong" || answerAssessment === "no_answer") {
      nextStageMastery = 0;
    }
  }

  const forceMoveForward =
    !isOffTopic &&
    (shouldSkipStage ||
      (isStruggleResponse && nextStuckCount >= 3) ||
      (isEndSignal && nextStuckCount >= 1));

  const isReadyToProgress =
    !isOffTopic && isProductiveResponse && nextStageMastery >= 2;
  const progressedStage =
    isReadyToProgress || forceMoveForward
      ? nextStage(resolvedCurrentStage)
      : resolvedCurrentStage;
  const isTerminalCodingStage =
    resolvedCurrentStage === INTERVIEW_STAGES[INTERVIEW_STAGES.length - 1] &&
    progressedStage === resolvedCurrentStage;

  if (progressedStage !== resolvedCurrentStage) {
    nextStuckCount = 0;
    nextStageMastery = 0;
  }

  session.messages.push({
    role: "user",
    content: normalizedMessage,
    timestamp: new Date(),
  });

  const nextPendingSkipConfirmation =
    shouldAskSkipConfirmation || shouldRepeatSkipConfirmation;
  const nextPendingSkipStage = nextPendingSkipConfirmation ? resolvedCurrentStage : "";
  const nextPendingSkipAskedAtTurn = nextPendingSkipConfirmation
    ? shouldAskSkipConfirmation
      ? (session.currentState?.turn || 0) + 1
      : Number(session.currentState?.pendingSkipAskedAtTurn || (session.currentState?.turn || 0) + 1)
    : 0;

  const draftState = {
    phase: "active",
    hintsGiven: session.currentState?.hintsGiven || 0,
    stuckCount: nextStuckCount,
    struggleCount: nextStuckCount,
    skipCount: nextSkipCount,
    skipPenalty: nextSkipPenalty,
    pendingSkipConfirmation: nextPendingSkipConfirmation,
    pendingSkipStage: nextPendingSkipStage,
    pendingSkipAskedAtTurn: nextPendingSkipAskedAtTurn,
    stageMastery: nextStageMastery,
    userStuck: nextStuckCount >= 2,
    turn: (session.currentState?.turn || 0) + 1,
    lastInterviewerQuestion: session.currentState?.lastInterviewerQuestion || "",
  };

  const recentConversation = formatConversationHistory(session.messages, interviewLastNChats);

  const recentInterviewerQuestions = session.messages
    .filter((message) => message.role === "interviewer")
    .slice(-3)
    .map((message) => message.content)
    .filter(Boolean);

  const avoidQuestion = recentInterviewerQuestions.join(" || ");

  const mustForceHint = !isOffTopic && nextStuckCount >= 2 && progressedStage === resolvedCurrentStage;
  const shouldSuggestEnding =
    isTerminalCodingStage && (shouldSkipStage || nextStuckCount >= 2 || isEndSignal);
  let interviewerContent;

  if (isOffTopic) {
    interviewerContent = humanOffTopicResponse(progressedStage, normalizedMessage);
  } else if (shouldAskSkipConfirmation || shouldRepeatSkipConfirmation) {
    interviewerContent = `quick check: do you want to skip the ${stageLabel(resolvedCurrentStage)} part? reply "yes skip" to confirm, or answer normally and we'll continue.`;
  } else if (shouldSuggestEnding) {
    interviewerContent =
      "no worries, we can stop here. i marked this final stage as skipped, so end the interview to view your score and feedback.";
  } else if (shouldSkipStage) {
    interviewerContent = `no problem, we'll skip this and move on. ${stageRedirectQuestion(progressedStage)}`;
  } else if (mustForceHint) {
    interviewerContent = stageFallbackQuestion(
      progressedStage,
      answerAssessment,
      nextStuckCount,
      isEndSignal,
      nextStageMastery
    );
  } else {
    interviewerContent = await generateInterviewerMessage({
      problemStatement: formatProblemStatement(session.problemId),
      conversationHistory: recentConversation,
      currentStage: progressedStage,
      stageMastery: nextStageMastery,
      struggleCount: nextStuckCount,
      answerAssessment,
      avoidQuestion,
      latestUserAnswer: normalizedMessage,
      latestCodeContext,
    });
  }

  if (!mustForceHint && isTooSimilarToAny(interviewerContent, recentInterviewerQuestions)) {
    interviewerContent = await generateInterviewerMessage({
      problemStatement: formatProblemStatement(session.problemId),
      conversationHistory: recentConversation,
      currentStage: progressedStage,
      stageMastery: nextStageMastery,
      struggleCount: nextStuckCount,
      answerAssessment,
      avoidQuestion,
      latestUserAnswer: normalizedMessage,
      latestCodeContext,
      retryCount: 1,
    });
  }

  if (isTooSimilarToAny(interviewerContent, recentInterviewerQuestions)) {
    interviewerContent = stageFallbackQuestion(
      progressedStage,
      answerAssessment,
      nextStuckCount,
      isEndSignal,
      nextStageMastery
    );
  }

  interviewerContent = ensureReactionPrefix(interviewerContent, answerAssessment);
  interviewerContent = enforceTwoLines(interviewerContent);

  const hintsGiven = draftState.hintsGiven + (HINT_PATTERN.test(interviewerContent) ? 1 : 0);

  const interviewerMessage = {
    role: "interviewer",
    content: interviewerContent,
    timestamp: new Date(),
  };

  session.messages.push(interviewerMessage);
  session.currentStage = progressedStage;
  session.currentState = {
    ...draftState,
    hintsGiven,
    lastInterviewerQuestion: interviewerContent,
    turn: draftState.turn + 1,
  };

  await session.save();

  return {
    ...toSessionResponse(session, session.problemId, {
      limit: interviewChatPageSize,
    }),
    interviewerMessage,
    currentStage: progressedStage,
  };
};

const compareInterviewSessionComplexity = async ({ userId, sessionId, userSolution }) => {
  const session = await InterviewSession.findById(sessionId).populate(
    "problemId",
    "title slug difficulty tags description constraints sampleTestCases editorialSolution optimalComplexity"
  );

  if (!session) {
    throw ApiError.notFound("Interview session not found");
  }

  if (String(session.userId) !== String(userId)) {
    throw ApiError.forbidden("You can only access your own interview sessions");
  }

  if (!session.problemId) {
    throw ApiError.notFound("Problem not found for this interview session");
  }

  const normalizedProvidedSolution = String(userSolution || "").trim();
  const derivedSolution = getRecentUserSolution(session.messages, 5);
  const solutionToEvaluate = normalizedProvidedSolution || derivedSolution;

  if (!solutionToEvaluate) {
    throw ApiError.badRequest("Add your approach or code first, then compare complexity");
  }

  const providedOptimalTime = String(session.problemId?.optimalComplexity?.time || "").trim();
  const providedOptimalSpace = String(session.problemId?.optimalComplexity?.space || "").trim();

  const generated = await generateComplexityComparison({
    problemStatement: formatProblemForComplexityComparison(session.problemId),
    editorialSolution: trimText(session.problemId?.editorialSolution || "", 3200),
    userSolution: trimText(solutionToEvaluate, 7800),
    providedOptimalTime,
    providedOptimalSpace,
  });

  const snapshot = {
    userSolution: trimText(solutionToEvaluate, 7800),
    userComplexity: {
      time: normalizeComplexityValue(generated.userComplexity?.time),
      space: normalizeComplexityValue(generated.userComplexity?.space),
      confidence: Math.max(0, Math.min(1, Number(generated.userComplexity?.confidence || 0))),
      rationale: normalizeComplexityValue(generated.userComplexity?.rationale, ""),
    },
    optimalComplexity: {
      time: normalizeComplexityValue(generated.optimalComplexity?.time),
      space: normalizeComplexityValue(generated.optimalComplexity?.space),
      source:
        generated.optimalComplexity?.source === "problem_data"
          ? "problem_data"
          : "ai_generated",
      rationale: normalizeComplexityValue(generated.optimalComplexity?.rationale, ""),
    },
    comparison: {
      verdict: ["better", "equal", "worse", "unknown"].includes(generated.comparison?.verdict)
        ? generated.comparison.verdict
        : "unknown",
      summary: normalizeComplexityValue(generated.comparison?.summary, ""),
      recommendation: normalizeComplexityValue(generated.comparison?.recommendation, ""),
    },
    createdAt: new Date(),
  };

  const existingComparisons = Array.isArray(session.complexityComparisons)
    ? session.complexityComparisons
    : [];
  session.complexityComparisons = [...existingComparisons, snapshot].slice(-MAX_COMPLEXITY_HISTORY);

  if (!session.currentState) {
    session.currentState = {
      phase: "active",
      hintsGiven: 0,
      stuckCount: 0,
      struggleCount: 0,
      skipCount: 0,
      skipPenalty: 0,
      pendingSkipConfirmation: false,
      pendingSkipStage: "",
      pendingSkipAskedAtTurn: 0,
      stageMastery: 0,
      userStuck: false,
      turn: 0,
      lastInterviewerQuestion: "",
      lastComplexityComparedAt: new Date(),
    };
  } else {
    session.currentState.lastComplexityComparedAt = new Date();
  }

  await session.save();

  return {
    sessionId: session._id,
    comparison: mapComplexitySnapshot(snapshot),
    comparisons: session.complexityComparisons
      .slice(-5)
      .map((item) => mapComplexitySnapshot(item)),
    latestComplexityComparison: mapComplexitySnapshot(snapshot),
  };
};

const getInterviewSession = async ({ userId, sessionId, beforeIndex, limit }) => {
  const session = await InterviewSession.findById(sessionId).populate(
    "problemId",
    "title slug difficulty"
  );

  if (!session) {
    throw ApiError.notFound("Interview session not found");
  }

  if (String(session.userId) !== String(userId)) {
    throw ApiError.forbidden("You can only access your own interview sessions");
  }

  const resolvedLimit =
    limit === undefined || limit === null || limit === ""
      ? MAX_CHAT_PAGE_SIZE
      : limit;

  return toSessionResponse(session, session.problemId, {
    beforeIndex,
    limit: resolvedLimit,
  });
};

const getInterviewSessionMessages = async ({ userId, sessionId, beforeIndex, limit }) => {
  const session = await InterviewSession.findById(sessionId);

  if (!session) {
    throw ApiError.notFound("Interview session not found");
  }

  if (String(session.userId) !== String(userId)) {
    throw ApiError.forbidden("You can only access your own interview sessions");
  }

  const resolvedLimit =
    limit === undefined || limit === null || limit === ""
      ? MAX_CHAT_PAGE_SIZE
      : limit;

  const paged = paginateMessages(session.messages, {
    beforeIndex,
    limit: resolvedLimit,
  });

  return {
    sessionId: session._id,
    messages: paged.messages,
    pagination: paged.pagination,
  };
};

const generateAndRunAdversarialTests = async ({ userId, sessionId, userCode, language }) => {
  const session = await InterviewSession.findById(sessionId).populate(
    "problemId",
    "title slug difficulty tags description constraints sampleTestCases"
  );

  if (!session) throw ApiError.notFound("Interview session not found");
  if (String(session.userId) !== String(userId)) throw ApiError.forbidden("Not your session");
  if (!session.problemId) throw ApiError.notFound("Problem not found for this session");

  const code = String(userCode || "").trim();
  if (!code) throw ApiError.badRequest("User code is required");

  const problemStatement = formatProblemForComplexityComparison(session.problemId);

  const testCases = await generateAdversarialTestCases({
    problemStatement,
    userCode: code,
    language,
  });

  const validTests = testCases.filter((tc) => tc.input && tc.expectedOutput);

  if (validTests.length === 0) {
    return {
      sessionId,
      testCases: testCases.map((tc, i) => ({ index: i + 1, ...tc })),
      executionResults: null,
      message: "AI generated test cases but could not determine expected outputs. Review the test cases manually.",
    };
  }

  const results = await judgeSubmission({
    language,
    code,
    testCases: validTests,
    timeLimit: 3000,
    memoryLimit: 256,
  });

  return {
    sessionId,
    testCases: validTests.map((tc, i) => ({
      index: i + 1,
      input: tc.input,
      expectedOutput: tc.expectedOutput,
      reason: tc.reason,
    })),
    executionResults: {
      verdict: results.verdict,
      passedCount: results.passedCount,
      totalCount: results.totalCount,
      failedTestCase: results.failedTestCase || null,
      expectedOutput: results.expectedOutput || null,
      actualOutput: results.actualOutput || null,
      runtime: results.runtime,
      stderr: results.stderr || null,
    },
  };
};

module.exports = {
  startInterviewSession,
  respondInterviewSession,
  compareInterviewSessionComplexity,
  generateAndRunAdversarialTests,
  getInterviewSession,
  getInterviewSessionMessages,
  endInterviewSession,
  saveCodeSnapshot,
  getInterviewHistory,
  getInterviewStats,
};

async function endInterviewSession({ userId, sessionId, status = "completed" }) {
  const session = await InterviewSession.findById(sessionId).populate(
    "problemId",
    "optimalComplexity"
  );
  if (!session) throw ApiError.notFound("Interview session not found");
  if (String(session.userId) !== String(userId)) throw ApiError.forbidden("Not your session");
  if (session.status !== "active") throw ApiError.badRequest("Session is already ended");

  session.status = status;
  session.endedAt = new Date();
  session.duration = Math.round((session.endedAt - session.createdAt) / 1000);

  // Calculate scoring
  const state = session.currentState || {};
  const stages = ["approach", "complexity", "edge_cases", "optimization", "coding"];
  const stageIndex = stages.indexOf(session.currentStage);
  const stageProgress = Math.min((stageIndex + 1) / stages.length, 1);

  let correctness = Math.round(stageProgress * 25);
  let optimality = 0;
  let communication = 0;
  let edgeCases = 0;
  let codeQuality = 0;

  const userMessages = (session.messages || []).filter((m) => m.role === "user");

  // Optimality: based on complexity comparisons
  const comparisons = session.complexityComparisons || [];
  if (comparisons.length > 0) {
    const lastComparison = comparisons[comparisons.length - 1];
    if (lastComparison.comparison.verdict === "equal" || lastComparison.comparison.verdict === "better") {
      optimality = 25;
    } else if (lastComparison.comparison.verdict === "worse") {
      optimality = 10;
    } else {
      optimality = 5;
    }
  } else {
    const explanationComplexity = inferComplexityFromMessages(session.messages || []);
    const latestCodeSnapshot =
      Array.isArray(session.codeSnapshots) && session.codeSnapshots.length > 0
        ? session.codeSnapshots[session.codeSnapshots.length - 1]
        : null;
    const codeComplexity = inferComplexityFromCode(latestCodeSnapshot?.code || "");

    optimality = scoreOptimalityFromSignals({
      targetComplexity: session.problemId?.optimalComplexity?.time || "",
      explanationComplexity,
      codeComplexity,
      stageIndex,
    });
  }

  // Communication: based on message count and struggle ratio
  const struggleRatio = userMessages.length > 0 ? (state.struggleCount || 0) / userMessages.length : 1;
  communication = Math.round(Math.max(0, 20 * (1 - struggleRatio)));

  // Edge cases: partial if they reached that stage
  if (stageIndex >= 2) edgeCases = 15;
  else if (stageIndex >= 1) edgeCases = 7;

  // Code quality: if they reached coding stage
  if (stageIndex >= 4) codeQuality = 15;
  else if (stageIndex >= 3) codeQuality = 7;

  // Penalties
  const hintsUsedPenalty = Math.min((state.hintsGiven || 0) * 3, 15);
  const skipPenalty = Math.min(Number(state.skipPenalty || 0), 25);
  const timePenalty = session.duration > 3600 ? 10 : session.duration > 1800 ? 5 : 0;

  const totalScore = Math.max(0, Math.min(100,
    correctness + optimality + communication + edgeCases + codeQuality - hintsUsedPenalty - skipPenalty - timePenalty
  ));

  const strengths = [];
  const weaknesses = [];
  if (correctness >= 20) strengths.push("Strong problem-solving approach");
  if (optimality >= 20) strengths.push("Good complexity optimization");
  if (communication >= 15) strengths.push("Clear communication");
  if (correctness < 15) weaknesses.push("Needs work on approaching problems");
  if (optimality < 10) weaknesses.push("Complexity analysis needs improvement");
  if (communication < 10) weaknesses.push("Communication could be clearer");
  if ((state.skipCount || 0) > 0) weaknesses.push("Too many skipped stages reduced depth of evaluation");

  session.scoring = {
    totalScore,
    correctness,
    optimality,
    communication,
    edgeCases,
    codeQuality,
    hintsUsedPenalty,
    skipPenalty,
    timePenalty,
    feedback: totalScore >= 70 ? "Great performance! You showed solid problem-solving skills." :
              totalScore >= 40 ? "Good attempt. Focus on the areas marked as weaknesses." :
              "Keep practicing. Review the feedback and try again.",
    strengths,
    weaknesses,
  };

  await session.save();

  return {
    sessionId: session._id,
    status: session.status,
    duration: session.duration,
    scoring: session.scoring,
  };
}

async function saveCodeSnapshot({ userId, sessionId, code, language }) {
  const session = await InterviewSession.findById(sessionId).select("userId status codeSnapshots");
  if (!session) throw ApiError.notFound("Interview session not found");
  if (String(session.userId) !== String(userId)) throw ApiError.forbidden("Not your session");

  if (session.codeSnapshots.length >= 50) {
    session.codeSnapshots.shift();
  }

  session.codeSnapshots.push({ code, language });
  await session.save();

  return { success: true, snapshotCount: session.codeSnapshots.length };
}

async function getInterviewHistory({ userId, page = 1, limit = 10, status = "all", difficulty = "all" }) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
  const skip = (safePage - 1) * safeLimit;

  const filter = { userId };
  if (status !== "all") filter.status = status;

  if (difficulty !== "all") {
    const problemIds = await Problem.find({ difficulty })
      .select("_id")
      .lean();

    if (!problemIds.length) {
      return {
        items: [],
        total: 0,
        page: safePage,
        pages: 1,
      };
    }

    filter.problemId = { $in: problemIds.map((problem) => problem._id) };
  }

  const [sessions, total] = await Promise.all([
    InterviewSession.find(filter)
      .populate("problemId", "title slug difficulty")
      .select("problemId status currentStage scoring duration createdAt endedAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(safeLimit)
      .lean(),
    InterviewSession.countDocuments(filter),
  ]);

  return {
    items: sessions.map((s) => ({
      sessionId: s._id,
      problem: s.problemId ? {
        id: s.problemId._id,
        title: s.problemId.title,
        slug: s.problemId.slug,
        difficulty: s.problemId.difficulty,
      } : null,
      status: s.status,
      currentStage: s.currentStage,
      score: s.scoring?.totalScore || 0,
      scoring: s.scoring
        ? {
            totalScore: s.scoring.totalScore || 0,
            correctness: s.scoring.correctness || 0,
            optimality: s.scoring.optimality || 0,
            communication: s.scoring.communication || 0,
            edgeCases: s.scoring.edgeCases || 0,
            codeQuality: s.scoring.codeQuality || 0,
            hintsUsedPenalty: s.scoring.hintsUsedPenalty || 0,
            skipPenalty: s.scoring.skipPenalty || 0,
            timePenalty: s.scoring.timePenalty || 0,
          }
        : null,
      duration: s.duration || 0,
      createdAt: s.createdAt,
      endedAt: s.endedAt,
    })),
    total,
    page: safePage,
    pages: Math.max(1, Math.ceil(total / safeLimit)),
  };
}

async function getInterviewStats({ userId }) {
  const objectUserId = new mongoose.Types.ObjectId(userId);

  const [
    totalSessions,
    completed,
    avgScoreResult,
    avgScoreAllResult,
    difficultyBreakdownRaw,
  ] = await Promise.all([
    InterviewSession.countDocuments({ userId }),
    InterviewSession.countDocuments({ userId, status: "completed" }),
    InterviewSession.aggregate([
      { $match: { userId: objectUserId, status: "completed" } },
      { $group: { _id: null, avgScore: { $avg: "$scoring.totalScore" }, avgDuration: { $avg: "$duration" } } },
    ]),
    InterviewSession.aggregate([
      { $match: { userId: objectUserId } },
      { $group: { _id: null, avgScoreAll: { $avg: { $ifNull: ["$scoring.totalScore", 0] } } } },
    ]),
    InterviewSession.aggregate([
      { $match: { userId: objectUserId } },
      {
        $lookup: {
          from: "problems",
          localField: "problemId",
          foreignField: "_id",
          as: "problem",
        },
      },
      { $unwind: "$problem" },
      {
        $group: {
          _id: "$problem.difficulty",
          count: { $sum: 1 },
          avgScore: {
            $avg: {
              $cond: [
                { $eq: ["$status", "completed"] },
                { $ifNull: ["$scoring.totalScore", 0] },
                null,
              ],
            },
          },
        },
      },
    ]),
  ]);

  const stats = avgScoreResult[0] || { avgScore: 0, avgDuration: 0 };
  const allScoreStats = avgScoreAllResult[0] || { avgScoreAll: 0 };

  const difficultyMap = {
    Easy: { difficulty: "Easy", count: 0, averageScore: 0 },
    Medium: { difficulty: "Medium", count: 0, averageScore: 0 },
    Hard: { difficulty: "Hard", count: 0, averageScore: 0 },
  };

  (difficultyBreakdownRaw || []).forEach((row) => {
    const key = row?._id;
    if (!difficultyMap[key]) return;
    difficultyMap[key] = {
      difficulty: key,
      count: Number(row.count || 0),
      averageScore: Math.round(Number(row.avgScore || 0)),
    };
  });

  return {
    totalSessions,
    completed,
    abandoned: totalSessions - completed,
    successRate: totalSessions > 0 ? Math.round((completed / totalSessions) * 100) : 0,
    averageScore: Math.round(stats.avgScore || 0),
    averageScoreAll: Math.round(allScoreStats.avgScoreAll || 0),
    averageDuration: Math.round(stats.avgDuration || 0),
    difficultyBreakdown: [difficultyMap.Easy, difficultyMap.Medium, difficultyMap.Hard],
  };
}
