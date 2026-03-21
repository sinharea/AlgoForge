import api from "./client";

export const problemApi = {
  list: (params: Record<string, unknown>) => api.get("/problems", { params }),
  getBySlug: (slug: string) => api.get(`/problems/slug/${slug}`),
  submit: (payload: { problemId: string; language: string; code: string; contestId?: string }) =>
    api.post("/submissions", payload),
  submission: (id: string) => api.get(`/submissions/${id}`),
  mySubmissions: () => api.get("/submissions/me"),
};
