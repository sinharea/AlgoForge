"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { clsx } from "clsx";
import { Clock, Tag, Copy, Check, BookOpen, FileCode, TestTube, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { problemApi, RunResult } from "@/src/api/problemApi";
import CodePlayground from "@/src/features/editor/CodePlayground";
import { EditorSkeleton } from "@/src/components/ui/Skeleton";
import ErrorState from "@/src/components/ui/ErrorState";
import { DifficultyBadge, StatusBadge } from "@/src/components/ui/Badge";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";
import { formatDistanceToNow } from "date-fns";

const templates: Record<string, string> = {
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}",
  python: "def solve():\n    pass\n\nif __name__ == '__main__':\n    solve()",
  javascript: "function solve() {\n    \n}\n\nsolve();",
  java: "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        \n    }\n}",
  go: "package main\n\nimport \"fmt\"\n\nfunc main() {\n    \n}",
  rust: "use std::io::{self, BufRead};\n\nfn main() {\n    \n}",
  typescript: "function solve(): void {\n    \n}\n\nsolve();",
};

const getStorageKey = (slug: string, language: string) => `algoforge_code_${slug}_${language}`;

const getVerdictIcon = (verdict: string) => {
  switch (verdict) {
    case "Accepted": return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case "Wrong Answer": return <XCircle className="h-4 w-4 text-rose-400" />;
    default: return <AlertTriangle className="h-4 w-4 text-amber-400" />;
  }
};

export default function ProblemDetailPage() {
  useProtectedRoute();
  const { slug } = useParams<{ slug: string }>();
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState(templates.cpp);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"description" | "submissions">("description");
  const [activeTestTab, setActiveTestTab] = useState<"samples" | "custom">("samples");
  const [customInput, setCustomInput] = useState("");
  const [runResults, setRunResults] = useState<RunResult[]>([]);

  // Load saved code from localStorage on mount and when slug/language changes
  useEffect(() => {
    if (!slug) return;
    const savedCode = localStorage.getItem(getStorageKey(slug, language));
    if (savedCode) {
      setCode(savedCode);
    } else {
      setCode(templates[language] || "");
    }
  }, [slug, language]);

  // Save code to localStorage whenever it changes
  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      if (slug) {
        localStorage.setItem(getStorageKey(slug, language), newCode);
      }
    },
    [slug, language]
  );

  // Handle language change
  const handleLanguageChange = useCallback(
    (newLanguage: string) => {
      setLanguage(newLanguage);
      // Clear run results when changing language
      setRunResults([]);
    },
    []
  );

  const problemQuery = useQuery({
    queryKey: ["problem", slug],
    queryFn: async () => (await problemApi.getBySlug(slug)).data,
    enabled: Boolean(slug),
  });

  // Fetch submission history for this problem
  const submissionsQuery = useQuery({
    queryKey: ["my-submissions", problemQuery.data?._id],
    queryFn: async () => (await problemApi.mySubmissions()).data,
    enabled: Boolean(problemQuery.data?._id),
    select: (data) => {
      // Filter to only this problem's submissions
      const items = data.items || data || [];
      return items.filter((s: any) => s.problem?._id === problemQuery.data?._id || s.problem === problemQuery.data?._id);
    },
  });

  const submissionMutation = useMutation({
    mutationFn: async () =>
      (
        await problemApi.submit({
          problemId: problemQuery.data._id,
          language,
          code,
        })
      ).data,
    onSuccess: (data) => {
      setSubmissionId(data.submissionId || data.submission?._id);
      setRunResults([]); // Clear run results when submitting
      toast.success("Submission queued");
      // Refetch submissions list
      submissionsQuery.refetch();
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.error?.message || error?.response?.data?.message || "Submit failed";
      toast.error(errorMsg);
    },
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const testCases =
        activeTestTab === "custom"
          ? [{ input: customInput }]
          : (problemQuery.data?.sampleTestCases || []).map((tc: any) => ({
              input: tc.input || "",
              expectedOutput: tc.expectedOutput,
            }));

      if (testCases.length === 0) {
        throw new Error("No test cases available");
      }

      return (await problemApi.run({ language, code, testCases })).data;
    },
    onSuccess: (data) => {
      setRunResults(data.results);
      const hasError = data.results.some((r) => r.stderr);
      const allPassed = data.results.every((r) => r.passed === true || r.passed === null);

      if (hasError) {
        toast.error("Runtime error occurred");
      } else if (activeTestTab === "samples" && allPassed) {
        toast.success("All test cases passed!");
      }
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || "Run failed";
      toast.error(errorMsg);
    },
  });

  const submissionQuery = useQuery({
    queryKey: ["submission", submissionId],
    queryFn: async () => (await problemApi.submission(submissionId!)).data,
    enabled: Boolean(submissionId),
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.status;
      return status === "queued" || status === "judging" ? 2000 : false;
    },
  });

  const result = useMemo(() => {
    const s = submissionQuery.data;
    if (!s) return {};
    return {
      verdict: s.verdict,
      runtime: s.runtime,
      output: s.result?.stdout,
      error: s.result?.stderr || s.result?.compileOutput,
      passedCount: s.result?.passedCount,
      totalCount: s.result?.totalCount,
    };
  }, [submissionQuery.data]);

  const copyToClipboard = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (problemQuery.isLoading) return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="card space-y-4">
          <div className="skeleton h-8 w-3/4" />
          <div className="skeleton h-4 w-1/4" />
          <div className="skeleton h-40" />
        </div>
        <EditorSkeleton />
      </div>
    </div>
  );

  if (problemQuery.isError) return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <ErrorState message="Failed to load problem" />
    </div>
  );

  const problem = problemQuery.data;
  const mySubmissions = submissionsQuery.data || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="flex flex-col">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
            <div className="card">
              <div className="mb-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h1 className="text-2xl font-bold">{problem.title}</h1>
                  <DifficultyBadge difficulty={problem.difficulty} />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
                  {problem.timeLimit && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{problem.timeLimit}ms</span>
                    </div>
                  )}
                  {(problem.tags || []).length > 0 && (
                    <div className="flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      <span>{problem.tags.join(", ")}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4 flex gap-1 border-b border-[var(--border-color)]">
                <button
                  onClick={() => setActiveTab("description")}
                  className={clsx(
                    "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                    activeTab === "description"
                      ? "border-[var(--accent-primary)] text-[var(--accent-secondary)]"
                      : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <BookOpen className="h-4 w-4" />
                  Description
                </button>
                <button
                  onClick={() => setActiveTab("submissions")}
                  className={clsx(
                    "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                    activeTab === "submissions"
                      ? "border-[var(--accent-primary)] text-[var(--accent-secondary)]"
                      : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <FileCode className="h-4 w-4" />
                  Submissions
                  {mySubmissions.length > 0 && (
                    <span className="rounded-full bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-xs">
                      {mySubmissions.length}
                    </span>
                  )}
                </button>
              </div>

              {activeTab === "description" && (
                <div className="space-y-6">
                  <div className="prose prose-invert max-w-none">
                    <p className="whitespace-pre-wrap text-[var(--text-secondary)] leading-relaxed">
                      {problem.description}
                    </p>
                  </div>

                  {(problem.sampleTestCases || []).length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <TestTube className="h-4 w-4 text-[var(--accent-secondary)]" />
                        <h2 className="font-semibold">Sample Test Cases</h2>
                      </div>
                      <div className="space-y-3">
                        {problem.sampleTestCases.map((tc: any, idx: number) => (
                          <div
                            key={idx}
                            className="overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)]"
                          >
                            <div className="border-b border-[var(--border-color)] bg-[var(--bg-tertiary)] px-4 py-2">
                              <span className="text-sm font-medium">Example {idx + 1}</span>
                            </div>
                            <div className="grid gap-4 p-4 sm:grid-cols-2">
                              <div>
                                <div className="mb-2 flex items-center justify-between">
                                  <span className="text-xs font-medium uppercase text-[var(--text-muted)]">
                                    Input
                                  </span>
                                  <button
                                    onClick={() => copyToClipboard(tc.input || "", idx)}
                                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                  >
                                    {copiedIndex === idx ? (
                                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5" />
                                    )}
                                  </button>
                                </div>
                                <pre className="rounded-md bg-[var(--bg-secondary)] p-3 text-sm">
                                  {tc.input || "(empty)"}
                                </pre>
                              </div>
                              <div>
                                <div className="mb-2 text-xs font-medium uppercase text-[var(--text-muted)]">
                                  Expected Output
                                </div>
                                <pre className="rounded-md bg-[var(--bg-secondary)] p-3 text-sm text-emerald-300">
                                  {tc.expectedOutput}
                                </pre>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "submissions" && (
                <div>
                  {submissionsQuery.isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
                    </div>
                  ) : mySubmissions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileCode className="mb-3 h-10 w-10 text-[var(--text-muted)]" />
                      <p className="text-[var(--text-muted)]">No submissions yet</p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">Submit your solution to see it here</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {mySubmissions.slice(0, 10).map((sub: any) => (
                        <div
                          key={sub._id}
                          className={clsx(
                            "rounded-lg border p-3 transition-colors",
                            sub.verdict === "Accepted"
                              ? "border-emerald-500/30 bg-emerald-500/5"
                              : sub.verdict === "Wrong Answer"
                                ? "border-rose-500/30 bg-rose-500/5"
                                : "border-[var(--border-color)] bg-[var(--bg-primary)]"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getVerdictIcon(sub.verdict)}
                              <span className={clsx(
                                "font-medium",
                                sub.verdict === "Accepted" && "text-emerald-400",
                                sub.verdict === "Wrong Answer" && "text-rose-400",
                                !["Accepted", "Wrong Answer"].includes(sub.verdict) && "text-amber-400"
                              )}>
                                {sub.verdict || sub.status}
                              </span>
                            </div>
                            <span className="text-xs text-[var(--text-muted)]">
                              {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                            <span className="rounded bg-[var(--bg-tertiary)] px-2 py-0.5">{sub.language}</span>
                            {sub.runtime && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {sub.runtime}ms
                              </span>
                            )}
                            {sub.result?.passedCount !== undefined && (
                              <span>{sub.result.passedCount}/{sub.result.totalCount} passed</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <CodePlayground
            language={language}
            code={code}
            setCode={handleCodeChange}
            setLanguage={handleLanguageChange}
            onSubmit={() => submissionMutation.mutate()}
            onRun={() => runMutation.mutate()}
            submitting={submissionMutation.isPending}
            running={runMutation.isPending}
            result={result}
            runResults={activeTestTab === "samples" || runResults.length > 0 ? runResults : undefined}
            activeTestTab={activeTestTab}
            setActiveTestTab={(tab) => {
              setActiveTestTab(tab);
              setRunResults([]); // Clear results when switching tabs
            }}
            customInput={customInput}
            setCustomInput={setCustomInput}
          />
        </div>
      </div>
    </div>
  );
}
