"use client";

import Editor from "@monaco-editor/react";
import { clsx } from "clsx";
import {
  Play,
  RotateCcw,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Send,
  FlaskConical,
  FileText,
} from "lucide-react";

export interface RunResult {
  input: string;
  expectedOutput?: string;
  actualOutput: string;
  stderr: string;
  passed: boolean | null;
  runtime: number;
}

type Props = {
  language: string;
  code: string;
  setCode: (value: string) => void;
  setLanguage: (value: string) => void;
  onSubmit: () => void;
  onRun: () => void;
  submitting: boolean;
  running: boolean;
  result?: {
    verdict?: string;
    runtime?: number;
    output?: string;
    error?: string;
    passedCount?: number;
    totalCount?: number;
  };
  runResults?: RunResult[];
  activeTestTab: "samples" | "custom";
  setActiveTestTab: (tab: "samples" | "custom") => void;
  customInput: string;
  setCustomInput: (value: string) => void;
};

const languages = [
  { value: "cpp", label: "C++", icon: "C++", monaco: "cpp" },
  { value: "python", label: "Python", icon: "Py", monaco: "python" },
  { value: "javascript", label: "JavaScript", icon: "JS", monaco: "javascript" },
  { value: "java", label: "Java", icon: "Ja", monaco: "java" },
  { value: "go", label: "Go", icon: "Go", monaco: "go" },
  { value: "rust", label: "Rust", icon: "Rs", monaco: "rust" },
  { value: "typescript", label: "TypeScript", icon: "TS", monaco: "typescript" },
];

export default function CodePlayground({
  language,
  code,
  setCode,
  setLanguage,
  onSubmit,
  onRun,
  submitting,
  running,
  result,
  runResults,
  activeTestTab,
  setActiveTestTab,
  customInput,
  setCustomInput,
}: Props) {
  const templates: Record<string, string> = {
    cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}",
    python: "def solve():\n    pass\n\nif __name__ == '__main__':\n    solve()",
    javascript: "function solve() {\n    \n}\n\nsolve();",
    java: "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        \n    }\n}",
    go: "package main\n\nimport \"fmt\"\n\nfunc main() {\n    \n}",
    rust: "use std::io::{self, BufRead};\n\nfn main() {\n    \n}",
    typescript: "function solve(): void {\n    \n}\n\nsolve();",
  };

  const handleReset = () => {
    setCode(templates[language] || "");
  };

  const getVerdictInfo = () => {
    if (!result?.verdict) return null;
    switch (result.verdict) {
      case "Accepted":
        return { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" };
      case "Wrong Answer":
        return { icon: XCircle, color: "text-rose-400", bg: "bg-rose-500/10" };
      default:
        return { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" };
    }
  };

  const verdictInfo = getVerdictInfo();
  const monacoLang = languages.find((l) => l.value === language)?.monaco || language;

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex flex-col gap-3 rounded-t-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <label className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="input select w-full min-w-[150px] leading-5 sm:w-[220px]"
          >
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <button
            onClick={handleReset}
            className="btn btn-ghost p-2"
            title="Reset code"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={onRun}
            disabled={running || submitting}
            className="btn btn-secondary whitespace-nowrap"
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run
              </>
            )}
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting || running}
            className="btn btn-success whitespace-nowrap"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit
              </>
            )}
          </button>
        </div>
      </div>

      <div className="monaco-container flex-1 rounded-none border-x border-[var(--border-color)]" style={{ minHeight: '400px' }}>
        <Editor
          height="100%"
          language={monacoLang}
          value={code}
          onChange={(v) => setCode(v || "")}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: "on",
            roundedSelection: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            padding: { top: 16 },
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
          }}
        />
      </div>

      <div className="rounded-b-xl border border-t-0 border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-color)] px-4 py-2">
          <button
            onClick={() => setActiveTestTab("samples")}
            className={clsx(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              activeTestTab === "samples"
                ? "bg-[var(--accent-primary)]/20 text-[var(--accent-secondary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
            )}
          >
            <FlaskConical className="h-4 w-4" />
            Test Cases
          </button>
          <button
            onClick={() => setActiveTestTab("custom")}
            className={clsx(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              activeTestTab === "custom"
                ? "bg-[var(--accent-primary)]/20 text-[var(--accent-secondary)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
            )}
          >
            <FileText className="h-4 w-4" />
            Custom Input
          </button>
        </div>

        <div className="p-4">
          {activeTestTab === "custom" && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-medium uppercase text-[var(--text-muted)]">
                  Custom Input
                </label>
                <textarea
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Enter your custom input here..."
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 text-sm font-mono focus:border-[var(--accent-primary)] focus:outline-none"
                  rows={4}
                />
              </div>

              {runResults && runResults.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-medium uppercase text-[var(--text-muted)]">
                    Output
                  </div>
                  {runResults[0].stderr ? (
                    <pre className="overflow-x-auto rounded-lg bg-rose-500/10 p-3 text-sm text-rose-300">
                      {runResults[0].stderr}
                    </pre>
                  ) : (
                    <pre className="overflow-x-auto rounded-lg bg-[var(--bg-primary)] p-3 text-sm text-emerald-300">
                      {runResults[0].actualOutput || "(no output)"}
                    </pre>
                  )}
                  <div className="mt-2 flex items-center gap-1 text-xs text-[var(--text-muted)]">
                    <Clock className="h-3 w-3" />
                    {runResults[0].runtime} ms
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTestTab === "samples" && (
            <>
              {runResults && runResults.length > 0 ? (
                <div className="space-y-4">
                  {runResults.map((r, idx) => (
                    <div
                      key={idx}
                      className={clsx(
                        "rounded-lg border p-4",
                        r.stderr
                          ? "border-amber-500/50 bg-amber-500/5"
                          : r.passed
                            ? "border-emerald-500/50 bg-emerald-500/5"
                            : r.passed === false
                              ? "border-rose-500/50 bg-rose-500/5"
                              : "border-[var(--border-color)] bg-[var(--bg-primary)]"
                      )}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-medium">Test Case {idx + 1}</span>
                        {r.stderr ? (
                          <span className="flex items-center gap-1 text-sm text-amber-400">
                            <AlertTriangle className="h-4 w-4" />
                            Error
                          </span>
                        ) : r.passed ? (
                          <span className="flex items-center gap-1 text-sm text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" />
                            Passed
                          </span>
                        ) : r.passed === false ? (
                          <span className="flex items-center gap-1 text-sm text-rose-400">
                            <XCircle className="h-4 w-4" />
                            Failed
                          </span>
                        ) : null}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <div className="mb-1 text-xs font-medium uppercase text-[var(--text-muted)]">
                            Input
                          </div>
                          <pre className="rounded-md bg-[var(--bg-secondary)] p-2 text-xs">
                            {r.input || "(empty)"}
                          </pre>
                        </div>
                        <div>
                          <div className="mb-1 text-xs font-medium uppercase text-[var(--text-muted)]">
                            Expected
                          </div>
                          <pre className="rounded-md bg-[var(--bg-secondary)] p-2 text-xs text-emerald-300">
                            {r.expectedOutput || "(not specified)"}
                          </pre>
                        </div>
                        <div>
                          <div className="mb-1 text-xs font-medium uppercase text-[var(--text-muted)]">
                            Your Output
                          </div>
                          <pre
                            className={clsx(
                              "rounded-md bg-[var(--bg-secondary)] p-2 text-xs",
                              r.stderr
                                ? "text-amber-300"
                                : r.passed
                                  ? "text-emerald-300"
                                  : "text-rose-300"
                            )}
                          >
                            {r.stderr || r.actualOutput || "(no output)"}
                          </pre>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-1 text-xs text-[var(--text-muted)]">
                        <Clock className="h-3 w-3" />
                        {r.runtime} ms
                      </div>
                    </div>
                  ))}
                </div>
              ) : result?.verdict ? (
                <div className="space-y-4">
                  <div className={clsx("flex items-center gap-4 rounded-lg p-4", verdictInfo?.bg)}>
                    {verdictInfo && <verdictInfo.icon className={clsx("h-6 w-6", verdictInfo.color)} />}
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className={clsx("text-lg font-semibold", verdictInfo?.color)}>
                          {result.verdict}
                        </span>
                        {result.passedCount !== undefined && result.totalCount !== undefined && (
                          <span className="text-sm text-[var(--text-secondary)]">
                            {result.passedCount}/{result.totalCount} test cases passed
                          </span>
                        )}
                      </div>
                      {result.runtime !== undefined && (
                        <div className="mt-1 flex items-center gap-1 text-sm text-[var(--text-secondary)]">
                          <Clock className="h-3.5 w-3.5" />
                          {result.runtime} ms
                        </div>
                      )}
                    </div>
                  </div>

                  {result.output && (
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase text-[var(--text-muted)]">
                        Standard Output
                      </div>
                      <pre className="overflow-x-auto rounded-lg bg-[var(--bg-primary)] p-3 text-sm text-emerald-300">
                        {result.output}
                      </pre>
                    </div>
                  )}

                  {result.error && (
                    <div>
                      <div className="mb-2 text-xs font-medium uppercase text-[var(--text-muted)]">
                        Error Output
                      </div>
                      <pre className="overflow-x-auto rounded-lg bg-rose-500/10 p-3 text-sm text-rose-300">
                        {result.error}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-sm text-[var(--text-muted)]">
                  Run your code to see the output
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
