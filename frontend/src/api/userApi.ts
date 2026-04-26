import api from "./client";

export const userApi = {
  heatmap: (year?: number) => api.get("/user/heatmap", { params: { year } }),
  topicStats: () => api.get("/user/topic-stats"),
  bookmarks: () => api.get("/user/bookmarks"),
  problemStatuses: () => api.get("/user/problem-statuses"),
  toggleBookmark: (problemId: string) => api.post(`/user/problems/${problemId}/bookmark`),
  toggleFavorite: (problemId: string) => api.post(`/user/problems/${problemId}/favorite`),
  attemptEfficiency: (params?: { topic?: string; difficulty?: string; range?: string }) =>
    api.get("/user/attempt-efficiency", { params }),
  topicProgress: (params?: { granularity?: string; months?: number }) =>
    api.get("/user/topic-progress", { params }),
  accuracyTrend: (days?: number) => api.get("/user/accuracy-trend", { params: { days } }),
  solveSpeed: (months?: number) => api.get("/user/solve-speed", { params: { months } }),
  topicErrors: (topic?: string) => api.get("/user/topic-errors", { params: { topic } }),
  topicTrends: (topics?: string[], weeks?: number) =>
    api.get("/user/topic-trends", { params: { topics: topics?.join(","), weeks } }),
  errorPatterns: () => api.get("/user/error-patterns"),
  weaknessComparison: () => api.get("/user/weakness-comparison"),
  milestones: () => api.get("/user/milestones"),
  insights: () => api.get("/user/insights"),
  weaknessDetailed: () => api.get("/user/weakness-detailed"),
  recFeedback: (problemId: string, event: string) =>
    api.post("/recommendations/feedback", { problemId, event }),
  modifyRecommendations: (modification: string) =>
    api.post("/recommendations/modify", { modification }),
};
