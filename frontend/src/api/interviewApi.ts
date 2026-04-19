import api from "./client";

export type InterviewMessage = {
  role: "interviewer" | "user";
  content: string;
  timestamp: string;
};

export type InterviewComplexityComparison = {
  userSolution: string;
  userComplexity: {
    time: string;
    space: string;
    confidence: number;
    rationale: string;
  };
  optimalComplexity: {
    time: string;
    space: string;
    source: "problem_data" | "ai_generated";
    rationale: string;
  };
  comparison: {
    verdict: "better" | "equal" | "worse" | "unknown";
    summary: string;
    recommendation: string;
  };
  createdAt?: string;
};

export type InterviewComplexityCompareResponse = {
  sessionId: string;
  comparison: InterviewComplexityComparison;
  comparisons: InterviewComplexityComparison[];
  latestComplexityComparison: InterviewComplexityComparison | null;
};

export type InterviewScoring = {
  totalScore: number;
  correctness: number;
  optimality: number;
  communication: number;
  edgeCases: number;
  codeQuality: number;
  hintsUsedPenalty: number;
  skipPenalty: number;
  timePenalty: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
};

export type InterviewSessionResponse = {
  sessionId: string;
  problem: {
    id: string;
    title: string;
    slug: string;
    difficulty: string;
  };
  messages: InterviewMessage[];
  status: "active" | "completed" | "abandoned";
  currentStage: "approach" | "complexity" | "edge_cases" | "optimization" | "coding";
  currentState: {
    phase: string;
    hintsGiven: number;
    struggleCount: number;
    stuckCount: number;
    skipCount?: number;
    skipPenalty?: number;
    stageMastery?: number;
    userStuck: boolean;
    lastComplexityComparedAt?: string | null;
    turn: number;
  };
  scoring?: InterviewScoring;
  duration?: number;
  latestComplexityComparison?: InterviewComplexityComparison | null;
  createdAt: string;
  endedAt?: string;
};

export type InterviewHistoryItem = {
  sessionId: string;
  problem: {
    id: string;
    title: string;
    slug: string;
    difficulty: string;
  } | null;
  status: string;
  currentStage: string;
  score: number;
  scoring?: {
    totalScore: number;
    correctness: number;
    optimality: number;
    communication: number;
    edgeCases: number;
    codeQuality: number;
    hintsUsedPenalty: number;
    skipPenalty: number;
    timePenalty: number;
  } | null;
  duration: number;
  createdAt: string;
  endedAt: string | null;
};

export type InterviewStats = {
  totalSessions: number;
  completed: number;
  abandoned: number;
  successRate: number;
  averageScore: number;
  averageScoreAll?: number;
  averageDuration: number;
  difficultyBreakdown?: Array<{
    difficulty: "Easy" | "Medium" | "Hard";
    count: number;
    averageScore: number;
  }>;
};

export const interviewApi = {
  start: (payload: { problemId: string }) => api.post<InterviewSessionResponse>("/interview/start", payload),
  respond: (payload: { sessionId: string; userMessage: string }) =>
    api.post<InterviewSessionResponse>("/interview/respond", payload),
  compare: (payload: { sessionId: string; userSolution?: string }) =>
    api.post<InterviewComplexityCompareResponse>("/interview/compare", payload),
  end: (payload: { sessionId: string; status?: "completed" | "abandoned" }) =>
    api.post<{ sessionId: string; status: string; duration: number; scoring: InterviewScoring }>("/interview/end", payload),
  saveCode: (payload: { sessionId: string; code: string; language: string }) =>
    api.post("/interview/code-snapshot", payload),
  getById: (sessionId: string) => api.get<InterviewSessionResponse>(`/interview/${sessionId}`),
  getHistory: (params?: { page?: number; limit?: number; status?: string; difficulty?: "Easy" | "Medium" | "Hard" | "all" }) =>
    api.get<{ items: InterviewHistoryItem[]; total: number; page: number; pages: number }>("/interview/history", { params }),
  getStats: () => api.get<InterviewStats>("/interview/stats"),
};
