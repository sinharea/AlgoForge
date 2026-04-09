import api from "./client";

export type AdminUser = {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  status: "active" | "banned";
  createdAt: string;
};

export type AdminReport = {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  } | null;
  targetId: string;
  targetType: string;
  reason: string;
  status: string;
  moderationAction: string;
  createdAt: string;
};

export type AnalyticsPayload = {
  totalUsers: number;
  activeUsers: number;
  submissionsPerDay: Array<{ date: string; count: number }>;
  popularProblems: Array<{
    problemId: string;
    title: string;
    slug: string;
    difficulty: string;
    submissions: number;
  }>;
};

export const adminApi = {
  listProblems: (params?: Record<string, unknown>) => api.get("/problems", { params }),
  getProblem: (id: string) => api.get(`/problems/${id}`),

  createProblem: (payload: {
    title: string;
    description: string;
    difficulty: "Easy" | "Medium" | "Hard";
    tags: string[];
    constraints?: string;
    questionNumber?: number;
  }) => api.post("/admin/problem", payload),

  updateProblem: (id: string, payload: Record<string, unknown>) =>
    api.put(`/admin/problem/${id}`, payload),

  deleteProblem: (id: string) => api.delete(`/admin/problem/${id}`),

  uploadTestcases: (formData: FormData) =>
    api.post("/admin/testcases", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }),

  listContests: () => api.get("/contests"),

  createContest: (payload: {
    name: string;
    description?: string;
    startTime: string;
    endTime: string;
    problemIds: string[];
  }) => api.post("/admin/contest", payload),

  updateContest: (id: string, payload: Record<string, unknown>) =>
    api.put(`/admin/contest/${id}`, payload),

  deleteContest: (id: string) => api.delete(`/admin/contest/${id}`),

  getUsers: (params?: Record<string, unknown>) =>
    api.get<{ items: AdminUser[]; total: number; page: number; pages: number }>("/admin/users", { params }),

  banUser: (userId: string) => api.post("/admin/ban-user", { userId }),
  unbanUser: (userId: string) => api.post("/admin/unban-user", { userId }),

  getReports: (params?: Record<string, unknown>) =>
    api.get<{ items: AdminReport[]; total: number; page: number; pages: number }>("/admin/reports", { params }),

  reportAction: (reportId: string, action: "delete" | "ignore") =>
    api.post("/admin/report/action", { reportId, action }),

  getAnalytics: () => api.get<AnalyticsPayload>("/admin/analytics"),
};
