import api from "./client";

export const userApi = {
  heatmap: (year?: number) => api.get("/user/heatmap", { params: { year } }),
  topicStats: () => api.get("/user/topic-stats"),
  bookmarks: () => api.get("/user/bookmarks"),
  problemStatuses: () => api.get("/user/problem-statuses"),
  toggleBookmark: (problemId: string) => api.post(`/user/problems/${problemId}/bookmark`),
  toggleFavorite: (problemId: string) => api.post(`/user/problems/${problemId}/favorite`),
};
