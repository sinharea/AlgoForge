const InterviewSession = require("../models/InterviewSession");
const Problem = require("../models/Problem");
const ApiError = require("../utils/apiError");
const { interviewLastNChats, interviewChatPageSize } = require("../config/env");
const {
  formatConversationHistory,
  generateInterviewerMessage,
  generateComplexityComparison,
} = require("./interviewLlmService");

const STUCK_PATTERN = /\b(stuck|hint|help|confused|no idea|don't know|dont know|unclear)\b/i;
const NO_ANSWER_PATTERN = /\b(idk|i don't know|dont know|no idea|not sure|skip|pass)\b/i;
const END_SIGNAL_PATTERN = /^(no|nope|that's all|thats all|nothing else)$/i;
const OFF_TOPIC_PATTERN = /\b(who are you|what are you|your name|hello|hi\b|hey\b|how are you|thanks|thank you|bye|good morning|good night)\b/i;
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
  correct: "yeah, that makes sense.",
  partial: "you're close, think about this:",
  wrong: "hmm, not exactly...",
  no_answer: "that's okay, let's think about it.",
};

const LEADING_REACTION_PATTERN = /^(yeah,?\s*that makes sense|yeah|yes|yep|good|great|exactly|correct|right|that makes sense|you're close,?\s*think about this:?|you're close|hmm,?\s*not exactly|not quite|that's okay,?\s*let'?s think about it|that's okay)[\s,.:!-]*/i;

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

  const startsPositive = /^(yeah|yes|yep|good|great|exactly|correct|right|that makes sense)\b/i.test(text);
  const startsPartial = /^you're close\b/i.test(text);
  const startsWrong = /^(hmm|not quite|i don't think|that doesn't seem right)\b/i.test(text);
  const startsNoAnswer = /^that's okay\b/i.test(text);

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

const getRecentUserSolution = (messages = [], maxMessages = 5) => {
  const recentUserMessages = messages
    .filter((message) => message.role === "user")
    .slice(-maxMessages)
    .map((message) => String(message.content || "").trim())
    .filter(Boolean);

  return recentUserMessages.join("\n\n").trim();
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

  const existingSession = await InterviewSession.findOne({
    userId,
    problemId: problem._id,
  }).sort({ createdAt: -1 });

  if (existingSession?.messages?.length) {
    return toSessionResponse(existingSession, problem, {
      limit: interviewChatPageSize,
    });
  }

  const currentState = {
    phase: "active",
    hintsGiven: 0,
    stuckCount: 0,
    struggleCount: 0,
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

  if (existingSession) {
    existingSession.messages = [
      {
        role: "interviewer",
        content: firstMessageContent,
        timestamp: new Date(),
      },
    ];
    existingSession.currentStage = currentStage;
    existingSession.currentState = {
      ...currentState,
      lastInterviewerQuestion: firstMessageContent,
    };
    await existingSession.save();

    return {
      ...toSessionResponse(existingSession, problem, {
        limit: interviewChatPageSize,
      }),
      firstMessage: existingSession.messages[0],
    };
  }

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

  const resolvedCurrentStage = normalizeStage(
    session.currentStage || session.currentState?.currentStage || "approach"
  );
  const isOffTopic = OFF_TOPIC_PATTERN.test(normalizedMessage.toLowerCase());
  const answerAssessment = assessUserResponse({
    stage: resolvedCurrentStage,
    userMessage: normalizedMessage,
  });
  const isEndSignal = END_SIGNAL_PATTERN.test(normalizedMessage.toLowerCase());

  const messageSignalsStuck = STUCK_PATTERN.test(normalizedMessage);
  const isStruggleResponse =
    !isOffTopic &&
    (messageSignalsStuck || answerAssessment === "wrong" || answerAssessment === "no_answer");

  let nextStuckCount = isStruggleResponse
    ? (session.currentState?.struggleCount ?? session.currentState?.stuckCount ?? 0) + 1
    : Math.max(0, (session.currentState?.struggleCount ?? session.currentState?.stuckCount ?? 0) - 1);

  const currentStageMastery = Number(session.currentState?.stageMastery || 0);
  let nextStageMastery = currentStageMastery;

  if (!isOffTopic) {
    if (answerAssessment === "correct") {
      nextStageMastery = Math.min(currentStageMastery + 1, 2);
    } else if (answerAssessment === "wrong" || answerAssessment === "no_answer") {
      nextStageMastery = 0;
    }
  }

  const forceMoveForward =
    !isOffTopic &&
    ((isStruggleResponse && nextStuckCount >= 3) || (isEndSignal && nextStuckCount >= 1));

  const isReadyToProgress = !isOffTopic && answerAssessment === "correct" && nextStageMastery >= 2;
  const progressedStage =
    isReadyToProgress || forceMoveForward
      ? nextStage(resolvedCurrentStage)
      : resolvedCurrentStage;

  if (progressedStage !== resolvedCurrentStage) {
    nextStuckCount = 0;
    nextStageMastery = 0;
  }

  session.messages.push({
    role: "user",
    content: normalizedMessage,
    timestamp: new Date(),
  });

  const draftState = {
    phase: "active",
    hintsGiven: session.currentState?.hintsGiven || 0,
    stuckCount: nextStuckCount,
    struggleCount: nextStuckCount,
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
  let interviewerContent;

  if (isOffTopic) {
    interviewerContent = stageRedirectQuestion(progressedStage);
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

  return toSessionResponse(session, session.problemId, {
    beforeIndex,
    limit,
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

  const paged = paginateMessages(session.messages, {
    beforeIndex,
    limit,
  });

  return {
    sessionId: session._id,
    messages: paged.messages,
    pagination: paged.pagination,
  };
};

module.exports = {
  startInterviewSession,
  respondInterviewSession,
  compareInterviewSessionComplexity,
  getInterviewSession,
  getInterviewSessionMessages,
};
