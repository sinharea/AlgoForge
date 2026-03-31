import api from "./client";

export const contestApi = {
  list: () => api.get("/contests"),
  detail: (id: string) => api.get(`/contests/${id}`),
  update: (id: string, payload: Record<string, unknown>) => api.put(`/contests/${id}`, payload),
  register: (id: string) => api.post(`/contests/${id}/register`),
  leaderboard: (id: string) => api.get(`/contests/${id}/leaderboard`),
};
