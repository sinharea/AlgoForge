import api from "./client";

export const authApi = {
  login: (payload: { email: string; password: string }) => api.post("/auth/login", payload),
  register: (payload: { name: string; email: string; password: string }) =>
    api.post("/auth/register", payload),
  me: () => api.get("/auth/me"),
  updateMe: (payload: { name?: string; avatarUrl?: string }) => api.patch("/auth/me", payload),
  meDashboard: () => api.get("/recommendations/dashboard"),
  recommendations: () => api.get("/recommendations"),
};
