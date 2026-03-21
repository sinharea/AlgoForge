import api from "./client";

export const contestApi = {
  list: () => api.get("/contests"),
  register: (id: string) => api.post(`/contests/${id}/register`),
  leaderboard: (id: string) => api.get(`/contests/${id}/leaderboard`),
};
