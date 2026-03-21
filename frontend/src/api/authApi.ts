import api from "./client";

export const authApi = {
  login: (payload: { email: string; password: string }) => api.post("/auth/login", payload),
  register: (payload: { name: string; email: string; password: string }) =>
    api.post("/auth/register", payload),
  meDashboard: () => api.get("/recommendations/dashboard"),
  recommendations: () => api.get("/recommendations"),
};
