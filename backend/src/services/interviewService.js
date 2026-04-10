const InterviewSession = require("../models/InterviewSession");
const Problem = require("../models/Problem");
const ApiError = require("../utils/apiError");
const {
  formatConversationHistory,
  generateInterviewerMessage,
} = require("./interviewLlmService");

const STUCK_PATTERN = /\b(stuck|hint|help|confused|no idea|don't know|dont know|unclear)\b/i;
const NO_ANSWER_PATTERN = /\b(idk|i don't know|dont know|no idea|not sure|skip|pass)\b/i;
const END_SIGNAL_PATTERN = /^(no|nope|that's all|thats all|nothing else)$/i;
const INTERVIEW_STAGES = ["approach", "complexity", "edge_cases", "optimization", "coding"];

const APPROACH_PATTERN = /\b(hash|map|set|array|two[-\s]?pointer|sliding\s+window|binary\s+search|dp|dynamic\s+programming|greedy|stack|queue|graph|tree|sort|prefix|backtrack|brute)\b/i;
const COMPLEXITY_PATTERN = /\b(o\s*\(|time\s*complexity|space\s*complexity|linear|log\s*n|quadratic|constant\s*space|n\s*log\s*n)\b/i;
const EDGE_PATTERN = /\b(edge|corner|empty|null|single|duplicate|negative|zero|overflow|boundary|large\s*input|one\s*element)\b/i;
const OPTIMIZATION_PATTERN = /\b(optimi[sz]e|improv|reduce|trade[-\s]?off|cache|memo|in[-\s]?place|precompute|early\s*exit|prune)\b/i;
const CODING_PATTERN = /\b(code|implement|function|loop|iterate|condition|if\s*\(|pseudo|variable|syntax|compile)\b/i;
const HINT_PATTERN = /\b(hint|consider|think about|try|focus on|could you)\b/i;
const HUMAN_OPENERS = [
  /^hmm\b/i,
  /^okay\b/i,
  /^interesting\b/i,
  /^that makes sense\b/i,
  /^not quite\b/i,
  /^yeah,? that makes sense\b/i,
  /^you're close\b/i,
  /^that's okay\b/i,
];

const REACTION_BY_ASSESSMENT = {
  correct: "yeah, that makes sense.",
  partial: "you're close, think about this:",
  wrong: "hmm, not exactly...",
  no_answer: "that's okay, let's think about it.",
};

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
  if (!text) return REACTION_BY_ASSESSMENT.partial;
  if (HUMAN_OPENERS.some((pattern) => pattern.test(text))) return text;
  return `${REACTION_BY_ASSESSMENT[assessment] || REACTION_BY_ASSESSMENT.partial} ${text}`;
};

const stageFallbackQuestion = (stage, assessment = "partial", struggleCount = 0, isEndSignal = false) => {
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

  const prompts = {
    approach: "okay, what approach would you start with here?",
    complexity: "interesting. what would the time and space complexity be?",
    edge_cases: "hmm, any tricky inputs that could break this?",
    optimization: "that makes sense. can this be optimized further?",
    coding: "okay, walk me through how you'd structure the implementation.",
  };

  return `${reaction} ${prompts[normalizeStage(stage)] || prompts.approach}`;
};

const assessUserResponse = ({ stage, userMessage }) => {
  const text = String(userMessage || "").trim();
  if (!text) return "no_answer";
  if (NO_ANSWER_PATTERN.test(text)) return "no_answer";
  if (STUCK_PATTERN.test(text)) return "wrong";

  const isSubstantive = text.length >= 24;
  const patternByStage = {
    approach: APPROACH_PATTERN,
    complexity: COMPLEXITY_PATTERN,
    edge_cases: EDGE_PATTERN,
    optimization: OPTIMIZATION_PATTERN,
    coding: CODING_PATTERN,
  };

  const pattern = patternByStage[normalizeStage(stage)] || APPROACH_PATTERN;
  if (pattern.test(text) && isSubstantive) return "correct";
  if (isSubstantive) return "partial";
  return "no_answer";
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

const toSessionResponse = (session, problem) => ({
  sessionId: session._id,
  problem: {
    id: problem._id,
    title: problem.title,
    slug: problem.slug,
    difficulty: problem.difficulty,
  },
  messages: session.messages,
  currentStage: normalizeStage(session.currentStage || session.currentState?.currentStage),
  currentState: session.currentState,
  createdAt: session.createdAt,
});

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
    userStuck: false,
    turn: 1,
    lastInterviewerQuestion: "",
  };

  const currentStage = "approach";

  const firstMessageContent = await generateInterviewerMessage({
    problemStatement: formatProblemStatement(problem),
    conversationHistory: "No prior messages yet.",
    currentStage,
    struggleCount: 0,
    answerAssessment: "no_answer",
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
    ...toSessionResponse(session, problem),
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
  const answerAssessment = assessUserResponse({
    stage: resolvedCurrentStage,
    userMessage: normalizedMessage,
  });
  const isEndSignal = END_SIGNAL_PATTERN.test(normalizedMessage.toLowerCase());

  const messageSignalsStuck = STUCK_PATTERN.test(normalizedMessage);
  const isStruggleResponse =
    messageSignalsStuck || answerAssessment === "wrong" || answerAssessment === "no_answer";

  let nextStuckCount = isStruggleResponse
    ? (session.currentState?.struggleCount ?? session.currentState?.stuckCount ?? 0) + 1
    : Math.max(0, (session.currentState?.struggleCount ?? session.currentState?.stuckCount ?? 0) - 1);

  const forceMoveForward =
    (isStruggleResponse && nextStuckCount >= 3) ||
    (isEndSignal && nextStuckCount >= 1);
  const progressedStage =
    answerAssessment === "correct" || forceMoveForward
      ? nextStage(resolvedCurrentStage)
      : resolvedCurrentStage;

  if (progressedStage !== resolvedCurrentStage) {
    nextStuckCount = 0;
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
    userStuck: nextStuckCount >= 2,
    turn: (session.currentState?.turn || 0) + 1,
    lastInterviewerQuestion: session.currentState?.lastInterviewerQuestion || "",
  };

  const recentConversation = formatConversationHistory(session.messages, 6);

  const recentInterviewerQuestions = session.messages
    .filter((message) => message.role === "interviewer")
    .slice(-3)
    .map((message) => message.content)
    .filter(Boolean);

  const avoidQuestion = recentInterviewerQuestions.join(" || ");

  const mustForceHint = nextStuckCount >= 2 && progressedStage === resolvedCurrentStage;
  let interviewerContent;

  if (mustForceHint) {
    interviewerContent = stageFallbackQuestion(progressedStage, answerAssessment, nextStuckCount, isEndSignal);
  } else {
    interviewerContent = await generateInterviewerMessage({
      problemStatement: formatProblemStatement(session.problemId),
      conversationHistory: recentConversation,
      currentStage: progressedStage,
      struggleCount: nextStuckCount,
      answerAssessment,
      avoidQuestion,
    });
  }

  if (!mustForceHint && isTooSimilarToAny(interviewerContent, recentInterviewerQuestions)) {
    interviewerContent = await generateInterviewerMessage({
      problemStatement: formatProblemStatement(session.problemId),
      conversationHistory: recentConversation,
      currentStage: progressedStage,
      struggleCount: nextStuckCount,
      answerAssessment,
      avoidQuestion,
      retryCount: 1,
    });
  }

  if (isTooSimilarToAny(interviewerContent, recentInterviewerQuestions)) {
    interviewerContent = stageFallbackQuestion(progressedStage, answerAssessment, nextStuckCount, isEndSignal);
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
    ...toSessionResponse(session, session.problemId),
    interviewerMessage,
    currentStage: progressedStage,
  };
};

const getInterviewSession = async ({ userId, sessionId }) => {
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

  return toSessionResponse(session, session.problemId);
};

module.exports = {
  startInterviewSession,
  respondInterviewSession,
  getInterviewSession,
};
