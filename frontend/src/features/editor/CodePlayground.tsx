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
  Terminal,
  AlertTriangle,
} from "lucide-react";
import { StatusBadge } from "@/src/components/ui/Badge";

type Props = {
  language: string;
  code: string;
  setCode: (value: string) => void;
  setLanguage: (value: string) => void;
  onSubmit: () => void;
  submitting: boolean;
  result?: {
    verdict?: string;
    runtime?: number;
    output?: string;
    error?: string;
    passedCount?: number;
    totalCount?: number;
  };
};

const languages = [
  { value: "cpp", label: "C++", icon: "C++" },
  { value: "python", label: "Python", icon: "Py" },
  { value: "javascript", label: "JavaScript", icon: "JS" },
];

export default function CodePlayground({
  language,
  code,
  setCode,
  setLanguage,
  onSubmit,
  submitting,
  result,
}: Props) {
  const handleReset = () => {
    const templates: Record<string, string> = {
      cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}",
      python: "def solve():\n    pass\n\nif __name__ == '__main__':\n    solve()",
      javascript: "function solve() {\n    \n}\n\nsolve();",
    };
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

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 rounded-t-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3">
        <div className="flex items-center gap-2">
          {languages.map((lang) => (
            <button
              key={lang.value}
              onClick={() => setLanguage(lang.value)}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                language === lang.value
                  ? "bg-[var(--accent-primary)]/20 text-[var(--accent-secondary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
              )}
            >
              <span className="hidden sm:inline">{lang.label}</span>
              <span className="sm:hidden">{lang.icon}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="btn btn-ghost p-2"
            title="Reset code"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="btn btn-success"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Submit
              </>
            )}
          </button>
        </div>
      </div>

      <div className="monaco-container flex-1 rounded-none border-x border-[var(--border-color)]" style={{ minHeight: '400px' }}>
        <Editor
          height="100%"
          language={language === "cpp" ? "cpp" : language}
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
        <div className="flex items-center gap-2 border-b border-[var(--border-color)] px-4 py-2">
          <Terminal className="h-4 w-4 text-[var(--text-muted)]" />
          <span className="text-sm font-medium">Output</span>
        </div>

        <div className="p-4">
          {result?.verdict ? (
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
        </div>
      </div>
    </div>
  );
}
