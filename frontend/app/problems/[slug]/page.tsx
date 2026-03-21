"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { clsx } from "clsx";
import { Clock, Tag, Copy, Check, BookOpen, FileCode, TestTube } from "lucide-react";
import { problemApi } from "@/src/api/problemApi";
import CodePlayground from "@/src/features/editor/CodePlayground";
import { EditorSkeleton } from "@/src/components/ui/Skeleton";
import ErrorState from "@/src/components/ui/ErrorState";
import { DifficultyBadge } from "@/src/components/ui/Badge";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";

const templates: Record<string, string> = {
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}",
  python: "def solve():\n    pass\n\nif __name__ == '__main__':\n    solve()",
  javascript: "function solve() {\n    \n}\n\nsolve();",
};

export default function ProblemDetailPage() {
  useProtectedRoute();
  const { slug } = useParams<{ slug: string }>();
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState(templates.cpp);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"description" | "submissions">("description");

  const problemQuery = useQuery({
    queryKey: ["problem", slug],
    queryFn: async () => (await problemApi.getBySlug(slug)).data,
    enabled: Boolean(slug),
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
      toast.success("Submission queued");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Submit failed");
    },
  });

  const submissionQuery = useQuery({
    queryKey: ["submission", submissionId],
    queryFn: async () => (await problemApi.submission(submissionId!)).data,
    enabled: Boolean(submissionId),
    refetchInterval: (query) => {
      const status = (query.state.data as any)?.status;
      return status === "queued" ? 2000 : false;
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
                <div className="flex items-center justify-center py-12 text-[var(--text-muted)]">
                  Submission history coming soon
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <CodePlayground
            language={language}
            code={code}
            setCode={setCode}
            setLanguage={(next) => {
              setLanguage(next);
              setCode(templates[next] || "");
            }}
            onSubmit={() => submissionMutation.mutate()}
            submitting={submissionMutation.isPending}
            result={result}
          />
        </div>
      </div>
    </div>
  );
}
