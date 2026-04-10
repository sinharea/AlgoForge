"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { clsx } from "clsx";
import { Clock, Tag, Copy, Check, BookOpen, FileCode, TestTube, CheckCircle2, XCircle, AlertTriangle, Loader2, ShieldCheck, Hash, Scale } from "lucide-react";
import { problemApi, RunResult } from "@/src/api/problemApi";
import { interviewApi } from "@/src/api/interviewApi";
import CodePlayground from "@/src/features/editor/CodePlayground";
import { EditorSkeleton } from "@/src/components/ui/Skeleton";
import ErrorState from "@/src/components/ui/ErrorState";
import { DifficultyBadge } from "@/src/components/ui/Badge";
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
const getLastLanguageKey = (slug: string) => `algoforge_last_lang_${slug}`;

const getVerdictIcon = (verdict?: string) => {
  switch (verdict) {
    case "Accepted": return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    case "Wrong Answer": return <XCircle className="h-4 w-4 text-rose-400" />;
    default: return <AlertTriangle className="h-4 w-4 text-amber-400" />;
  }
};

type SubmissionResult = {
  stdout?: string;
  stderr?: string;
  compileOutput?: string;
  passedCount?: number;
  totalCount?: number;
  failedTestCase?: number;
  expectedOutput?: string;
  actualOutput?: string;
};

type SubmissionRecord = {
  _id: string;
  status?: string;
  verdict?: string;
  runtime?: number;
  language?: string;
  code?: string;
  createdAt?: string;
  result?: SubmissionResult;
};

type DiffRow = {
  type: "same" | "changed" | "added" | "removed";
  left: string;
  right: string;
  line: number;
};

const buildCodeDiff = (leftCode = "", rightCode = "") => {
  const leftLines = leftCode.split("\n");
  const rightLines = rightCode.split("\n");
  const maxLen = Math.max(leftLines.length, rightLines.length);
  const rows: DiffRow[] = [];

  for (let i = 0; i < maxLen; i += 1) {
    const left = leftLines[i] ?? "";
    const right = rightLines[i] ?? "";

    if (left === right) {
      rows.push({ type: "same", left, right, line: i + 1 });
    } else if (left && !right) {
      rows.push({ type: "removed", left, right, line: i + 1 });
    } else if (!left && right) {
      rows.push({ type: "added", left, right, line: i + 1 });
    } else {
      rows.push({ type: "changed", left, right, line: i + 1 });
    }
  }

  const changedRows = rows.filter((row) => row.type !== "same");
  return {
    hasChanges: changedRows.length > 0,
    rows,
    changedRows,
  };
};

export default function ProblemDetailPage() {
  useProtectedRoute();
  const router = useRouter();
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const contestId = searchParams.get("contestId");
  const contestTitle = searchParams.get("contestTitle");
  const isContestMode = Boolean(contestId);
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState(templates.cpp);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"description" | "submissions">("description");
  const [activeTestTab, setActiveTestTab] = useState<"samples" | "custom">("samples");
  const [customInput, setCustomInput] = useState("");
  const [runResults, setRunResults] = useState<RunResult[]>([]);
  const [submissionFilter, setSubmissionFilter] = useState<"all" | "Accepted" | "Wrong Answer" | "Runtime Error" | "Compilation Error" | "other">("all");
  const [copiedSubmissionCode, setCopiedSubmissionCode] = useState(false);
  const [languageInitialized, setLanguageInitialized] = useState(false);

  // Load saved code from localStorage on mount and when slug/language changes
  useEffect(() => {
    if (!slug) return;

    if (isContestMode) {
      setCode(templates[language] || "");
      return;
    }

    const savedCode = localStorage.getItem(getStorageKey(slug, language));
    if (savedCode) {
      setCode(savedCode);
    } else {
      setCode(templates[language] || "");
    }
  }, [slug, language, isContestMode]);

  // Save code to localStorage whenever it changes
  const handleCodeChange = useCallback(
    (newCode: string) => {
      setCode(newCode);
      if (slug && !isContestMode) {
        localStorage.setItem(getStorageKey(slug, language), newCode);
      }
    },
    [slug, language, isContestMode]
  );

  // Handle language change
  const handleLanguageChange = useCallback(
    (newLanguage: string) => {
      setLanguage(newLanguage);
      if (slug && !isContestMode) {
        localStorage.setItem(getLastLanguageKey(slug), newLanguage);
      }
      // Clear run results when changing language
      setRunResults([]);
    },
    [slug, isContestMode]
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
          contestId: contestId || undefined,
        })
      ).data,
    onSuccess: (data) => {
      const newSubmissionId = data.submissionId || data.submission?._id;
      setSubmissionId(newSubmissionId);
      setSelectedSubmissionId(newSubmissionId || null);
      setActiveTab("submissions");
      if (slug && !isContestMode) {
        localStorage.setItem(getLastLanguageKey(slug), language);
      }
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

  const startInterviewMutation = useMutation({
    mutationFn: async () => {
      if (!problemQuery.data?._id) {
        throw new Error("Problem not ready yet");
      }

      return (await interviewApi.start({ problemId: problemQuery.data._id })).data;
    },
    onSuccess: (data) => {
      toast.success("Interview session started");
      router.push(`/interview/${data.sessionId}`);
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.error?.message || error?.message || "Unable to start interview";
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

  const selectedSubmissionQuery = useQuery({
    queryKey: ["submission-details", selectedSubmissionId],
    queryFn: async () => (await problemApi.submission(selectedSubmissionId!)).data as SubmissionRecord,
    enabled: Boolean(selectedSubmissionId),
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

  const mySubmissions = (submissionsQuery.data || []) as SubmissionRecord[];

  const filteredSubmissions = useMemo(() => {
    if (submissionFilter === "all") return mySubmissions;
    if (submissionFilter === "other") {
      return mySubmissions.filter(
        (sub) => !["Accepted", "Wrong Answer", "Runtime Error", "Compilation Error"].includes(sub.verdict || "")
      );
    }
    return mySubmissions.filter((sub) => sub.verdict === submissionFilter);
  }, [mySubmissions, submissionFilter]);

  const codeDiff = useMemo(() => {
    const submittedCode = selectedSubmissionQuery.data?.code || "";
    return buildCodeDiff(submittedCode, code || "");
  }, [selectedSubmissionQuery.data?.code, code]);

  useEffect(() => {
    if (!slug || languageInitialized || !submissionsQuery.isFetched) return;

    if (isContestMode) {
      setLanguageInitialized(true);
      return;
    }

    const savedLanguage = localStorage.getItem(getLastLanguageKey(slug));
    if (savedLanguage && templates[savedLanguage]) {
      setLanguage(savedLanguage);
      setLanguageInitialized(true);
      return;
    }

    const lastSubmittedLanguage = mySubmissions[0]?.language;
    if (lastSubmittedLanguage && templates[lastSubmittedLanguage]) {
      setLanguage(lastSubmittedLanguage);
      localStorage.setItem(getLastLanguageKey(slug), lastSubmittedLanguage);
    }

    setLanguageInitialized(true);
  }, [slug, languageInitialized, mySubmissions, submissionsQuery.isFetched, isContestMode]);

  useEffect(() => {
    if (activeTab !== "submissions") return;
    if (selectedSubmissionId) return;
    if (filteredSubmissions.length > 0) {
      setSelectedSubmissionId(filteredSubmissions[0]._id);
    }
  }, [activeTab, filteredSubmissions, selectedSubmissionId]);

  useEffect(() => {
    setCopiedSubmissionCode(false);
  }, [selectedSubmissionId]);

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

  return (
    <div className="mx-auto max-w-7xl overflow-x-hidden px-4 py-6 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="min-w-0 flex flex-col">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto">
            <div className="card">
              <div className="mb-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-[var(--bg-tertiary)] px-2 py-0.5 text-xs font-medium text-[var(--text-muted)]">
                      <Hash className="h-3 w-3" />
                      Problem {problem.questionNumber || "-"}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-bold">{problem.title}</h1>
                      <Link
                        href={`/problems/${slug}/discuss`}
                        className="rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-3 py-1 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-primary)] hover:text-[var(--accent-secondary)]"
                      >
                        💬 Discussions
                      </Link>
                    </div>
                  </div>
                  <DifficultyBadge difficulty={problem.difficulty} />
                </div>

                {contestId && (
                  <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                    <p className="font-medium">Contest Mode {contestTitle ? `| ${contestTitle}` : ""}</p>
                    <p className="mt-1 text-xs text-emerald-300/90">
                      Submissions from this page are counted for the contest leaderboard.
                    </p>
                  </div>
                )}

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
                  {problem.memoryLimit && (
                    <div className="flex items-center gap-1">
                      <Scale className="h-4 w-4" />
                      <span>{problem.memoryLimit}MB</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="h-4 w-4" />
                    <span>{problem.hiddenTestCaseCount || 0} hidden tests</span>
                  </div>
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

                  {problem.constraints && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <Scale className="h-4 w-4 text-[var(--accent-secondary)]" />
                        <h2 className="font-semibold">Constraints</h2>
                      </div>
                      <pre className="whitespace-pre-wrap rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)]">
                        {problem.constraints}
                      </pre>
                    </div>
                  )}

                  {(problem.sampleTestCases || []).length > 0 && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <TestTube className="h-4 w-4 text-[var(--accent-secondary)]" />
                        <h2 className="font-semibold">Sample Test Cases</h2>
                      </div>
                      <div className="space-y-3">
                        {problem.sampleTestCases.slice(0, 3).map((tc: any, idx: number) => (
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
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        {[
                          { label: "All", value: "all" as const },
                          { label: "Accepted", value: "Accepted" as const },
                          { label: "Wrong Answer", value: "Wrong Answer" as const },
                          { label: "Runtime Error", value: "Runtime Error" as const },
                          { label: "Compilation Error", value: "Compilation Error" as const },
                          { label: "Other", value: "other" as const },
                        ].map((chip) => (
                          <button
                            key={chip.value}
                            type="button"
                            onClick={() => setSubmissionFilter(chip.value)}
                            className={clsx(
                              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                              submissionFilter === chip.value
                                ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/15 text-[var(--accent-secondary)]"
                                : "border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                            )}
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-2">
                      {filteredSubmissions.slice(0, 10).map((sub: SubmissionRecord) => (
                        <button
                          type="button"
                          key={sub._id}
                          onClick={() => setSelectedSubmissionId(sub._id)}
                          className={clsx(
                            "w-full rounded-lg border p-3 text-left transition-colors",
                            selectedSubmissionId === sub._id && "ring-1 ring-[var(--accent-primary)]",
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
                                !["Accepted", "Wrong Answer"].includes(sub.verdict || "") && "text-amber-400"
                              )}>
                                {sub.verdict || sub.status}
                              </span>
                            </div>
                            <span className="text-xs text-[var(--text-muted)]">
                              {sub.createdAt ? formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true }) : "-"}
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
                              <span>
                                {sub.result.passedCount}/{sub.result.totalCount} passed
                              </span>
                            )}
                          </div>
                        </button>
                      ))}

                      {filteredSubmissions.length === 0 && (
                        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-muted)]">
                          No submissions found for selected filter.
                        </div>
                      )}
                      </div>

                      {selectedSubmissionId && (
                        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-4">
                          {selectedSubmissionQuery.isLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
                            </div>
                          ) : selectedSubmissionQuery.data ? (
                            <>
                              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                                  Submission Details
                                </h3>
                                <span className="text-xs text-[var(--text-secondary)]">
                                  {selectedSubmissionQuery.data.verdict || selectedSubmissionQuery.data.status}
                                </span>
                              </div>

                              <div className="mb-4 grid gap-2 text-xs text-[var(--text-secondary)] sm:grid-cols-2">
                                <div>Language: {selectedSubmissionQuery.data.language || "-"}</div>
                                <div>Runtime: {selectedSubmissionQuery.data.runtime ?? "-"} ms</div>
                                <div>
                                  Passed: {selectedSubmissionQuery.data.result?.passedCount ?? 0}/
                                  {selectedSubmissionQuery.data.result?.totalCount ?? 0}
                                </div>
                                <div>
                                  Failed: {Math.max(
                                    0,
                                    (selectedSubmissionQuery.data.result?.totalCount ?? 0) -
                                      (selectedSubmissionQuery.data.result?.passedCount ?? 0)
                                  )}
                                </div>
                              </div>

                              <div className="mb-4">
                                <div className="mb-2 flex items-center justify-between">
                                  <div className="text-xs font-medium uppercase text-[var(--text-muted)]">
                                    Submitted Code
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(selectedSubmissionQuery.data?.code || "");
                                      setCopiedSubmissionCode(true);
                                      setTimeout(() => setCopiedSubmissionCode(false), 1500);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-md border border-[var(--border-color)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                                  >
                                    {copiedSubmissionCode ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                    {copiedSubmissionCode ? "Copied" : "Copy"}
                                  </button>
                                </div>
                                <pre className="max-h-64 overflow-auto rounded-md bg-[var(--bg-secondary)] p-3 text-xs">
                                  {selectedSubmissionQuery.data.code || "(code unavailable)"}
                                </pre>
                              </div>

                              <div className="mb-4">
                                <div className="mb-2 text-xs font-medium uppercase text-[var(--text-muted)]">
                                  Diff vs Current Editor Code
                                </div>
                                {!codeDiff.hasChanges ? (
                                  <div className="rounded-md bg-emerald-500/10 p-2 text-xs text-emerald-300">
                                    No differences. Editor code matches submitted code.
                                  </div>
                                ) : (
                                  <div className="max-h-64 overflow-auto rounded-md bg-[var(--bg-secondary)] p-2 text-xs">
                                    {codeDiff.changedRows.slice(0, 120).map((row, idx) => (
                                      <div
                                        key={`${row.line}-${idx}`}
                                        className={clsx(
                                          "mb-1 grid grid-cols-[50px_1fr_1fr] gap-2 rounded px-2 py-1",
                                          row.type === "changed" && "bg-amber-500/10",
                                          row.type === "removed" && "bg-rose-500/10",
                                          row.type === "added" && "bg-emerald-500/10"
                                        )}
                                      >
                                        <span className="text-[var(--text-muted)]">L{row.line}</span>
                                        <pre className="overflow-x-auto whitespace-pre-wrap text-rose-300">{row.left || "(empty)"}</pre>
                                        <pre className="overflow-x-auto whitespace-pre-wrap text-emerald-300">{row.right || "(empty)"}</pre>
                                      </div>
                                    ))}
                                    {codeDiff.changedRows.length > 120 && (
                                      <div className="mt-2 text-[var(--text-muted)]">
                                        Showing first 120 changed lines.
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {selectedSubmissionQuery.data.result?.failedTestCase ? (
                                <div className="mb-4 text-xs text-rose-300">
                                  Failed at test case #{selectedSubmissionQuery.data.result.failedTestCase}
                                </div>
                              ) : null}

                              {selectedSubmissionQuery.data.result?.expectedOutput !== undefined && (
                                <div className="mb-3">
                                  <div className="mb-1 text-xs font-medium uppercase text-[var(--text-muted)]">
                                    Expected Output
                                  </div>
                                  <pre className="overflow-auto rounded-md bg-[var(--bg-secondary)] p-2 text-xs text-emerald-300">
                                    {selectedSubmissionQuery.data.result.expectedOutput || "(empty)"}
                                  </pre>
                                </div>
                              )}

                              {selectedSubmissionQuery.data.result?.actualOutput !== undefined && (
                                <div className="mb-3">
                                  <div className="mb-1 text-xs font-medium uppercase text-[var(--text-muted)]">
                                    Actual Output
                                  </div>
                                  <pre className="overflow-auto rounded-md bg-[var(--bg-secondary)] p-2 text-xs text-rose-300">
                                    {selectedSubmissionQuery.data.result.actualOutput || "(empty)"}
                                  </pre>
                                </div>
                              )}

                              {selectedSubmissionQuery.data.result?.stderr && (
                                <div className="mb-3">
                                  <div className="mb-1 text-xs font-medium uppercase text-[var(--text-muted)]">
                                    Runtime Error
                                  </div>
                                  <pre className="overflow-auto rounded-md bg-rose-500/10 p-2 text-xs text-rose-300">
                                    {selectedSubmissionQuery.data.result.stderr}
                                  </pre>
                                </div>
                              )}

                              {selectedSubmissionQuery.data.result?.compileOutput && (
                                <div>
                                  <div className="mb-1 text-xs font-medium uppercase text-[var(--text-muted)]">
                                    Compile Output
                                  </div>
                                  <pre className="overflow-auto rounded-md bg-amber-500/10 p-2 text-xs text-amber-300">
                                    {selectedSubmissionQuery.data.result.compileOutput}
                                  </pre>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-[var(--text-muted)]">Unable to load submission details.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        <div className="min-w-0">
          <CodePlayground
            language={language}
            code={code}
            setCode={handleCodeChange}
            setLanguage={handleLanguageChange}
            onStartInterview={() => startInterviewMutation.mutate()}
            onSubmit={() => submissionMutation.mutate()}
            onRun={() => runMutation.mutate()}
            interviewStarting={startInterviewMutation.isPending}
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
