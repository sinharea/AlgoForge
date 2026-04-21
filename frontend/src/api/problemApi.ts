import api from "./client";

export interface TestCase {
  input: string;
  expectedOutput?: string;
}

export interface RunResult {
  input: string;
  expectedOutput?: string;
  actualOutput: string;
  stderr: string;
  passed: boolean | null;
  runtime: number;
}

export interface ProblemHint {
  level: number;
  content: string;
  type: "approach" | "algorithm" | "code" | "edge_case";
}

export interface ProblemEditorial {
  editorial: string;
  approach: string;
  optimalComplexity: {
    time: string;
    space: string;
    notes: string;
  };
}

export interface SimilarProblem {
  _id: string;
  title: string;
  slug: string;
  difficulty: string;
  tags: string[];
}

export const problemApi = {
  list: (params: Record<string, unknown>) => api.get("/problems", { params }),
  getById: (id: string) => api.get(`/problems/${id}`),
  getBySlug: (slug: string) => api.get(`/problems/slug/${slug}`),
  getHints: (slug: string, level?: number) =>
    api.get<{ hints: ProblemHint[]; total: number }>(`/problems/slug/${slug}/hints`, { params: { level } }),
  getEditorial: (slug: string) =>
    api.get<ProblemEditorial>(`/problems/slug/${slug}/editorial`),
  getSimilarProblems: (slug: string) =>
    api.get<{ similar: SimilarProblem[] }>(`/problems/slug/${slug}/similar`),
  submit: (payload: { problemId: string; language: string; code: string; contestId?: string; timeTaken?: number }) =>
    api.post("/submissions", payload),
  run: (payload: { language: string; code: string; testCases: TestCase[] }) =>
    api.post<{ results: RunResult[] }>("/submissions/run", payload),
  submission: (id: string) => api.get(`/submissions/${id}`),
  mySubmissions: (params?: Record<string, unknown>) => api.get("/submissions/me", { params }),
};
