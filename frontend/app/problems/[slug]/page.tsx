"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { problemApi } from "@/src/api/problemApi";
import CodePlayground from "@/src/features/editor/CodePlayground";
import Loader from "@/src/components/ui/Loader";
import ErrorState from "@/src/components/ui/ErrorState";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";

const templates: Record<string, string> = {
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\nint main(){\n  return 0;\n}",
  python: "def solve():\n    pass\n\nif __name__ == '__main__':\n    solve()",
  javascript: "function solve(){\n  return;\n}\n\nsolve();",
};

export default function ProblemDetailPage() {
  useProtectedRoute();
  const { slug } = useParams<{ slug: string }>();
  const [language, setLanguage] = useState("cpp");
  const [code, setCode] = useState(templates.cpp);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

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
      setSubmissionId(data.submissionId);
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
    };
  }, [submissionQuery.data]);

  if (problemQuery.isLoading) return <Loader />;
  if (problemQuery.isError) return <ErrorState message="Failed to load problem" />;

  const problem = problemQuery.data;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <section className="space-y-4 rounded border border-slate-800 bg-slate-900 p-5">
        <h1 className="text-2xl font-semibold">{problem.title}</h1>
        <div className="text-sm text-slate-400">{problem.difficulty}</div>
        <p className="whitespace-pre-wrap text-slate-300">{problem.description}</p>
        <div className="space-y-2">
          <h2 className="font-medium">Sample Cases</h2>
          {(problem.sampleTestCases || []).map((tc: any, idx: number) => (
            <div key={idx} className="rounded border border-slate-800 bg-slate-950 p-3 text-sm">
              <div>Input: {tc.input}</div>
              <div>Output: {tc.expectedOutput}</div>
            </div>
          ))}
        </div>
      </section>

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
  );
}
