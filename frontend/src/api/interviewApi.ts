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

export type InterviewSessionResponse = {
  sessionId: string;
  problem: {
    id: string;
    title: string;
    slug: string;
    difficulty: string;
  };
  messages: InterviewMessage[];
  currentStage: "approach" | "complexity" | "edge_cases" | "optimization" | "coding";
  currentState: {
    phase: string;
    hintsGiven: number;
    struggleCount: number;
    stuckCount: number;
    stageMastery?: number;
    userStuck: boolean;
    lastComplexityComparedAt?: string | null;
    turn: number;
  };
  latestComplexityComparison?: InterviewComplexityComparison | null;
  createdAt: string;
};

export const interviewApi = {
  start: (payload: { problemId: string }) => api.post<InterviewSessionResponse>("/interview/start", payload),
  respond: (payload: { sessionId: string; userMessage: string }) =>
    api.post<InterviewSessionResponse>("/interview/respond", payload),
  compare: (payload: { sessionId: string; userSolution?: string }) =>
    api.post<InterviewComplexityCompareResponse>("/interview/compare", payload),
  getById: (sessionId: string) => api.get<InterviewSessionResponse>(`/interview/${sessionId}`),
};
