import api from "./client";

export type InterviewMessage = {
  role: "interviewer" | "user";
  content: string;
  timestamp: string;
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
    stuckCount: number;
    userStuck: boolean;
    turn: number;
  };
  createdAt: string;
};

export const interviewApi = {
  start: (payload: { problemId: string }) => api.post<InterviewSessionResponse>("/interview/start", payload),
  respond: (payload: { sessionId: string; userMessage: string }) =>
    api.post<InterviewSessionResponse>("/interview/respond", payload),
  getById: (sessionId: string) => api.get<InterviewSessionResponse>(`/interview/${sessionId}`),
};
