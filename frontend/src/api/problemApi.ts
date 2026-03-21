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

export const problemApi = {
  list: (params: Record<string, unknown>) => api.get("/problems", { params }),
  getBySlug: (slug: string) => api.get(`/problems/slug/${slug}`),
  submit: (payload: { problemId: string; language: string; code: string; contestId?: string }) =>
    api.post("/submissions", payload),
  run: (payload: { language: string; code: string; testCases: TestCase[] }) =>
    api.post<{ results: RunResult[] }>("/submissions/run", payload),
  submission: (id: string) => api.get(`/submissions/${id}`),
  mySubmissions: () => api.get("/submissions/me"),
};
