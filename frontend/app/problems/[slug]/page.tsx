"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { clsx } from "clsx";
import { Clock, Tag, Copy, Check, BookOpen, FileCode, TestTube, CheckCircle2, XCircle, AlertTriangle, Loader2, ShieldCheck, Hash, Scale, Lightbulb, GraduationCap, Sparkles, X } from "lucide-react";
import { problemApi, RunResult } from "@/src/api/problemApi";
import { interviewApi, InterviewComplexityComparison } from "@/src/api/interviewApi";
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
  const [activeTab, setActiveTab] = useState<"description" | "submissions" | "hints" | "editorial">("description");
  const [activeTestTab, setActiveTestTab] = useState<"samples" | "custom">("samples");
  const [customInput, setCustomInput] = useState("");
  const [runResults, setRunResults] = useState<RunResult[]>([]);
  const [submissionFilter, setSubmissionFilter] = useState<"all" | "Accepted" | "Wrong Answer" | "Runtime Error" | "Compilation Error" | "other">("all");
  const [copiedSubmissionCode, setCopiedSubmissionCode] = useState(false);
  const [languageInitialized, setLanguageInitialized] = useState(false);
  const [latestComplexityComparison, setLatestComplexityComparison] = useState<InterviewComplexityComparison | null>(null);
  const [activeInterviewSessionId, setActiveInterviewSessionId] = useState<string | null>(null);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [revealedHintLevel, setRevealedHintLevel] = useState(0);
  const pageLoadedAt = useRef(Date.now());

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

  const hintsQuery = useQuery({
    queryKey: ["problem-hints", slug],
    queryFn: async () => (await problemApi.getHints(slug)).data,
    enabled: activeTab === "hints" && Boolean(slug),
  });

  const editorialQuery = useQuery({
    queryKey: ["problem-editorial", slug],
    queryFn: async () => (await problemApi.getEditorial(slug)).data,
    enabled: activeTab === "editorial" && Boolean(slug),
  });

  const similarQuery = useQuery({
    queryKey: ["problem-similar", slug],
    queryFn: async () => (await problemApi.getSimilarProblems(slug)).data,
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
          timeTaken: Math.round((Date.now() - pageLoadedAt.current) / 1000),
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

      const startResponse = await interviewApi.start({ problemId: problemQuery.data._id });
      const sessionData = startResponse.data;

      const normalizedCode = String(code || "").trim();
      if (normalizedCode) {
        // Best-effort snapshot so interviewer context can use current editor solution.
        try {
          await interviewApi.saveCode({
            sessionId: sessionData.sessionId,
            code: normalizedCode,
            language,
          });
        } catch {
          // Ignore snapshot save failures; interview start should still succeed.
        }
      }

      return sessionData;
    },
    onSuccess: (data) => {
      setActiveInterviewSessionId(data.sessionId);
      toast.success("Interview session started");
      router.push(`/interview/${data.sessionId}`);
    },
    onError: (error: any) => {
      const errorMsg = error?.response?.data?.error?.message || error?.message || "Unable to start interview";
      toast.error(errorMsg);
    },
  });

  const compareComplexityMutation = useMutation({
    mutationFn: async () => {
      if (!problemQuery.data?._id) {
        throw new Error("Problem not ready yet");
      }

      const startResponse = await interviewApi.start({ problemId: problemQuery.data._id });
      const sessionId = startResponse.data.sessionId;
      const normalizedSolution = String(code || "").trim();
      const comparePayload = normalizedSolution
        ? { sessionId, userSolution: normalizedSolution }
        : { sessionId };

      const compareResponse = await interviewApi.compare(comparePayload);
      const compareData = compareResponse.data;

      return {
        ...compareData,
        sessionId: compareData.sessionId ?? sessionId,
      };
    },
    onSuccess: (data) => {
      setActiveInterviewSessionId(data.sessionId);
      const nextComparison = data.latestComplexityComparison || data.comparison || null;
      setLatestComplexityComparison(nextComparison);

      if (nextComparison) {
        setIsComparisonModalOpen(true);
        toast.success("Complexity comparison ready.");
      } else {
        toast.error("Comparison result is empty. Please try again.");
      }
    },
    onError: (error: any) => {
      const errorMsg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Unable to compare complexity";
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

  const comparisonVerdictMeta = useMemo(() => {
    if (!latestComplexityComparison) {
      return null;
    }

    const verdict = latestComplexityComparison.comparison.verdict;
    if (verdict === "equal") {
      return {
        label: "Matches Optimal",
        className: "bg-[#dcebdd] text-[#2f6f4e] border-[#98bba3]",
      };
    }
    if (verdict === "better") {
      return {
        label: "Better Than Baseline",
        className: "bg-[#e8e0cc] text-[#6d5328] border-[#c4b28f]",
      };
    }
    if (verdict === "worse") {
      return {
        label: "Needs Optimization",
        className: "bg-[#f1ddcc] text-[#8c5c26] border-[#d7a97a]",
      };
    }

    return {
      label: "Uncertain",
      className: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-color)]",
    };
  }, [latestComplexityComparison]);

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

  useEffect(() => {
    if (!isComparisonModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsComparisonModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isComparisonModalOpen]);

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
          <div className="sticky top-0 max-h-[calc(100vh-6rem)] overflow-y-auto">
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

              <div className="mb-4 flex gap-1 border-b border-[var(--border-color)] overflow-x-auto">
                <button
                  onClick={() => setActiveTab("description")}
                  className={clsx(
                    "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                    activeTab === "description"
                      ? "border-[var(--accent-primary)] text-[var(--accent-secondary)]"
                      : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <BookOpen className="h-4 w-4" />
                  Description
                </button>
                <button
                  onClick={() => setActiveTab("hints")}
                  className={clsx(
                    "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                    activeTab === "hints"
                      ? "border-amber-400 text-amber-300"
                      : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <Lightbulb className="h-4 w-4" />
                  Hints
                </button>
                <button
                  onClick={() => setActiveTab("editorial")}
                  className={clsx(
                    "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                    activeTab === "editorial"
                      ? "border-emerald-400 text-emerald-300"
                      : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  <GraduationCap className="h-4 w-4" />
                  Editorial
                </button>
                <button
                  onClick={() => setActiveTab("submissions")}
                  className={clsx(
                    "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap",
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

              {activeTab === "hints" && (
                <div className="space-y-4">
                  {hintsQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
                    </div>
                  ) : (hintsQuery.data?.hints || []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Lightbulb className="mb-3 h-10 w-10 text-amber-400/40" />
                      <p className="text-[var(--text-muted)]">No hints available for this problem yet.</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">Try working through it on your own!</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Reveal hints progressively. Try solving on your own first!
                      </p>
                      <div className="space-y-3">
                        {(hintsQuery.data?.hints || []).map((hint, idx) => (
                          <div
                            key={idx}
                            className={clsx(
                              "rounded-xl border transition-all duration-300",
                              revealedHintLevel >= hint.level
                                ? "border-amber-500/30 bg-amber-500/8"
                                : "border-[var(--border-color)] bg-[var(--bg-primary)]"
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => setRevealedHintLevel(Math.max(revealedHintLevel, hint.level))}
                              className="flex w-full items-center justify-between px-4 py-3 text-left"
                            >
                              <div className="flex items-center gap-2">
                                <span className={clsx(
                                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                                  revealedHintLevel >= hint.level
                                    ? "bg-amber-500/20 text-amber-300"
                                    : "bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
                                )}>
                                  {hint.level}
                                </span>
                                <span className="text-sm font-medium">
                                  {hint.type === "approach" ? "Approach Hint" :
                                   hint.type === "algorithm" ? "Algorithm Hint" :
                                   hint.type === "code" ? "Code Hint" : "Edge Case Hint"}
                                </span>
                              </div>
                              {revealedHintLevel < hint.level && (
                                <span className="text-xs text-amber-400">Click to reveal</span>
                              )}
                            </button>
                            {revealedHintLevel >= hint.level && (
                              <div className="border-t border-amber-500/20 px-4 py-3">
                                <p className="whitespace-pre-wrap text-sm text-[var(--text-secondary)] leading-relaxed">
                                  {hint.content}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">
                        {revealedHintLevel}/{hintsQuery.data?.total || 0} hints revealed
                      </p>
                    </>
                  )}
                </div>
              )}

              {activeTab === "editorial" && (
                <div className="space-y-6">
                  {editorialQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                    </div>
                  ) : !editorialQuery.data?.editorial && !editorialQuery.data?.approach ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <GraduationCap className="mb-3 h-10 w-10 text-emerald-400/40" />
                      <p className="text-[var(--text-muted)]">No editorial available yet.</p>
                    </div>
                  ) : (
                    <>
                      {editorialQuery.data?.approach && (
                        <div>
                          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-300">
                            <Sparkles className="h-4 w-4" />
                            Approach
                          </h3>
                          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                            <p className="whitespace-pre-wrap text-sm text-[var(--text-secondary)] leading-relaxed">
                              {editorialQuery.data.approach}
                            </p>
                          </div>
                        </div>
                      )}

                      {editorialQuery.data?.optimalComplexity && (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-cyan-300/80">Time Complexity</p>
                            <p className="mt-1 text-lg font-semibold text-cyan-200">{editorialQuery.data.optimalComplexity.time || "—"}</p>
                          </div>
                          <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-violet-300/80">Space Complexity</p>
                            <p className="mt-1 text-lg font-semibold text-violet-200">{editorialQuery.data.optimalComplexity.space || "—"}</p>
                          </div>
                        </div>
                      )}

                      {editorialQuery.data?.editorial && (
                        <div>
                          <h3 className="mb-2 text-sm font-semibold text-emerald-300">Solution</h3>
                          <pre className="max-h-96 overflow-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)] leading-relaxed">
                            {editorialQuery.data.editorial}
                          </pre>
                        </div>
                      )}
                    </>
                  )}

                  {(similarQuery.data?.similar || []).length > 0 && (
                    <div>
                      <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Similar Problems</h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {similarQuery.data!.similar.map((p) => (
                          <Link
                            key={p._id}
                            href={`/problems/${p.slug}`}
                            className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 transition hover:border-[var(--accent-primary)]/50"
                          >
                            <p className="text-sm font-medium">{p.title}</p>
                            <div className="mt-1 flex items-center gap-2">
                              <span className={clsx(
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                p.difficulty === "Easy" && "bg-emerald-500/15 text-emerald-300",
                                p.difficulty === "Medium" && "bg-amber-500/15 text-amber-300",
                                p.difficulty === "Hard" && "bg-rose-500/15 text-rose-300"
                              )}>
                                {p.difficulty}
                              </span>
                              {p.tags?.slice(0, 2).map((t) => (
                                <span key={t} className="text-[10px] text-[var(--text-muted)]">{t}</span>
                              ))}
                            </div>
                          </Link>
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
            onCompareComplexity={() => compareComplexityMutation.mutate()}
            onSubmit={() => submissionMutation.mutate()}
            onRun={() => runMutation.mutate()}
            interviewStarting={startInterviewMutation.isPending}
            comparingComplexity={compareComplexityMutation.isPending}
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

      {isComparisonModalOpen && latestComplexityComparison && comparisonVerdictMeta ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={() => setIsComparisonModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Complexity comparison"
            className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-[0_30px_60px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] p-5">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
                  <Scale className="h-5 w-5 text-[var(--accent-secondary)]" />
                  Complexity Comparison
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Your current solution vs estimated optimal complexity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsComparisonModalOpen(false)}
                className="btn btn-ghost h-9 w-9 rounded-full p-0"
                aria-label="Close comparison modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[78vh] space-y-4 overflow-y-auto p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${comparisonVerdictMeta.className}`}>
                  {comparisonVerdictMeta.label}
                </span>
                <button
                  type="button"
                  onClick={() => compareComplexityMutation.mutate()}
                  disabled={compareComplexityMutation.isPending}
                  className="btn btn-secondary"
                >
                  {compareComplexityMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Comparing...
                    </>
                  ) : (
                    <>
                      <Scale className="h-4 w-4" />
                      Compare Again
                    </>
                  )}
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border border-[#c7b79a] bg-[#f7efde] p-3">
                  <p className="text-xs uppercase tracking-wide text-[#7a6440]">Your Complexity (AI)</p>
                  <p className="mt-2 text-sm text-[var(--text-primary)]">
                    Time: <span className="font-semibold">{latestComplexityComparison.userComplexity.time}</span>
                  </p>
                  <p className="text-sm text-[var(--text-primary)]">
                    Space: <span className="font-semibold">{latestComplexityComparison.userComplexity.space}</span>
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Confidence: {Math.round((latestComplexityComparison.userComplexity.confidence || 0) * 100)}%
                  </p>
                </div>

                <div className="rounded-lg border border-[#bda7c9] bg-[#f2ebf8] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wide text-[#6f5986]">Optimal Complexity</p>
                    <span className="rounded-full border border-[#bda7c9] bg-[#ebe1f5] px-2 py-0.5 text-[10px] text-[#5f4a73]">
                      {latestComplexityComparison.optimalComplexity.source === "problem_data"
                        ? "from problem data"
                        : "from AI"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-primary)]">
                    Time: <span className="font-semibold">{latestComplexityComparison.optimalComplexity.time}</span>
                  </p>
                  <p className="text-sm text-[var(--text-primary)]">
                    Space: <span className="font-semibold">{latestComplexityComparison.optimalComplexity.space}</span>
                  </p>
                </div>
              </div>

              <p className="text-sm text-[var(--text-secondary)]">
                {latestComplexityComparison.comparison.summary || "No summary available."}
              </p>
              {latestComplexityComparison.comparison.recommendation ? (
                <p className="text-xs text-[var(--text-muted)]">
                  Recommendation: {latestComplexityComparison.comparison.recommendation}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--border-color)] pt-3">
                <button
                  type="button"
                  onClick={() => setIsComparisonModalOpen(false)}
                  className="btn btn-ghost"
                >
                  Close
                </button>
                {activeInterviewSessionId ? (
                  <Link href={`/interview/${activeInterviewSessionId}`} className="btn btn-secondary">
                    Continue in Interview Prompt Box
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
