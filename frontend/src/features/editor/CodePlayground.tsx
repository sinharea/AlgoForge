"use client";

import Editor, { OnMount } from "@monaco-editor/react";
import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import {
  Play,
  RotateCcw,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Send,
  Mic,
  FlaskConical,
  FileText,
  AlignLeft,
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
  onStartInterview?: () => void;
  onSubmit: () => void;
  onRun: () => void;
  interviewStarting?: boolean;
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

const DEFAULT_TIMER_MINUTES = 30;
const MIN_TIMER_MINUTES = 1;
const MAX_TIMER_MINUTES = 300;

const countMatches = (value: string, pattern: RegExp) => value.match(pattern)?.length ?? 0;

const reindentBraceLanguage = (source: string, indentUnit = "    ") => {
  const lines = source.split("\n");
  let indentLevel = 0;

  const next = lines.map((rawLine) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      return "";
    }

    const leadingClosers = (trimmed.match(/^[}\])]+/)?.[0].length ?? 0);
    const lineIndentLevel = Math.max(0, indentLevel - leadingClosers);
    const normalizedLine = `${indentUnit.repeat(lineIndentLevel)}${trimmed}`;

    const opens = countMatches(trimmed, /[\[{(]/g);
    const closes = countMatches(trimmed, /[\]})]/g);
    indentLevel = Math.max(0, indentLevel + opens - closes);

    return normalizedLine;
  });

  return next.join("\n");
};

const reindentPython = (source: string, indentUnit = "    ") => {
  const lines = source.split("\n");
  let indentLevel = 0;

  const next = lines.map((rawLine) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      return "";
    }

    if (/^(elif|else|except|finally)\b/.test(trimmed)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const normalizedLine = `${indentUnit.repeat(indentLevel)}${trimmed}`;
    const shouldIndentNext = /:\s*(#.*)?$/.test(trimmed) && !trimmed.startsWith("#");

    if (shouldIndentNext) {
      indentLevel += 1;
    }

    return normalizedLine;
  });

  return next.join("\n");
};

const fallbackAutoIndent = (source: string, language: string) => {
  if (!source.trim()) {
    return source;
  }

  if (language === "python") {
    return reindentPython(source);
  }

  if (["cpp", "java", "javascript", "typescript", "go", "rust"].includes(language)) {
    return reindentBraceLanguage(source);
  }

  return source;
};

const formatClock = (totalSeconds: number) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export default function CodePlayground({
  language,
  code,
  setCode,
  setLanguage,
  onStartInterview,
  onSubmit,
  onRun,
  interviewStarting = false,
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
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const [isAutoIndenting, setIsAutoIndenting] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(DEFAULT_TIMER_MINUTES);
  const [timerMinutesInput, setTimerMinutesInput] = useState(String(DEFAULT_TIMER_MINUTES));
  const [timerSeconds, setTimerSeconds] = useState(DEFAULT_TIMER_MINUTES * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showTimerPanel, setShowTimerPanel] = useState(false);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [showStopwatchPanel, setShowStopwatchPanel] = useState(false);

  useEffect(() => {
    if (!timerRunning) return;

    const intervalId = window.setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [timerRunning]);

  useEffect(() => {
    if (!stopwatchRunning) return;

    const intervalId = window.setInterval(() => {
      setStopwatchSeconds((prev) => prev + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [stopwatchRunning]);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const runEditorAction = async (actionId: string) => {
    const editor = editorRef.current;
    if (!editor) return false;

    const action = editor.getAction(actionId);
    if (action) {
      try {
        await action.run();
        return true;
      } catch {
        // Fall through to command trigger.
      }
    }

    try {
      editor.trigger("auto-indent", actionId, {});
      return true;
    } catch {
      return false;
    }
  };

  const handleAutoIndent = async () => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model || isAutoIndenting) return;

    setIsAutoIndenting(true);
    try {
      const beforeValue = model.getValue();

      editor.focus();
      await runEditorAction("editor.action.formatDocument");
      await runEditorAction("editor.action.reindentlines");

      const afterBuiltIn = model.getValue();
      if (afterBuiltIn !== beforeValue) {
        return;
      }

      const fallbackValue = fallbackAutoIndent(beforeValue, language);
      if (fallbackValue === beforeValue) {
        return;
      }

      editor.pushUndoStop();
      editor.executeEdits("auto-indent-fallback", [
        {
          range: model.getFullModelRange(),
          text: fallbackValue,
          forceMoveMarkers: true,
        },
      ]);
      editor.pushUndoStop();
    } finally {
      setIsAutoIndenting(false);
    }
  };

  const applyTimerDuration = () => {
    const parsed = Number(timerMinutesInput);
    if (!Number.isFinite(parsed)) return;

    const normalized = Math.min(MAX_TIMER_MINUTES, Math.max(MIN_TIMER_MINUTES, Math.floor(parsed)));
    setTimerMinutes(normalized);
    setTimerMinutesInput(String(normalized));
    setTimerRunning(false);
    setTimerSeconds(normalized * 60);
    setShowTimerPanel(true);
  };

  const handleResetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(timerMinutes * 60);
    setShowTimerPanel(false);
  };

  const handleResetStopwatch = () => {
    setStopwatchRunning(false);
    setStopwatchSeconds(0);
    setShowStopwatchPanel(false);
  };

  const handleToggleTimerRunning = () => {
    setShowTimerPanel(true);
    setTimerRunning((prev) => !prev);
  };

  const handleToggleStopwatchRunning = () => {
    setShowStopwatchPanel(true);
    setStopwatchRunning((prev) => !prev);
  };

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
            onClick={handleAutoIndent}
            disabled={isAutoIndenting}
            className="btn btn-ghost whitespace-nowrap px-3 py-2"
            title="Auto indent code"
          >
            {isAutoIndenting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Indenting...
              </>
            ) : (
              <>
                <AlignLeft className="h-4 w-4" />
                Auto Indent
              </>
            )}
          </button>
          <button
            onClick={() => setShowTimerPanel((prev) => !prev)}
            className="btn btn-ghost whitespace-nowrap px-3 py-2"
            title="Show timer"
          >
            <Clock className="h-4 w-4" />
            Timer
          </button>
          <button
            onClick={() => setShowStopwatchPanel((prev) => !prev)}
            className="btn btn-ghost whitespace-nowrap px-3 py-2"
            title="Show stopwatch"
          >
            <Play className="h-4 w-4" />
            Stopwatch
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
          {onStartInterview ? (
            <button
              onClick={onStartInterview}
              disabled={interviewStarting || submitting || running}
              className="btn btn-secondary whitespace-nowrap"
            >
              {interviewStarting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" />
                  🎤 Start Interview
                </>
              )}
            </button>
          ) : null}
          <button
            onClick={onSubmit}
            disabled={submitting || running || interviewStarting}
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

      {(showTimerPanel || showStopwatchPanel) && (
        <div className="flex flex-wrap items-center gap-3 border-x border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-2">
          {showTimerPanel && (
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-[var(--bg-primary)] px-2.5 py-1.5 text-xs">
              <span className="flex items-center gap-1 font-medium uppercase tracking-wide text-[var(--text-muted)]">
                <Clock className="h-3.5 w-3.5" />
                Timer
              </span>
              <span className="min-w-[56px] font-mono text-sm text-[var(--text-primary)]">{formatClock(timerSeconds)}</span>
              <input
                type="number"
                min={MIN_TIMER_MINUTES}
                max={MAX_TIMER_MINUTES}
                value={timerMinutesInput}
                onChange={(e) => setTimerMinutesInput(e.target.value)}
                className="h-7 w-16 rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2 text-xs text-[var(--text-primary)]"
                aria-label="Timer minutes"
              />
              <button
                type="button"
                onClick={applyTimerDuration}
                disabled={timerRunning}
                className="rounded border border-[var(--border-color)] px-2 py-0.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Set
              </button>
              <button
                type="button"
                onClick={handleToggleTimerRunning}
                disabled={timerSeconds === 0}
                className="rounded border border-[var(--border-color)] px-2 py-0.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {timerRunning ? "Pause" : "Start"}
              </button>
              <button
                type="button"
                onClick={handleResetTimer}
                className="rounded border border-[var(--border-color)] px-2 py-0.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimerRunning(false);
                  setShowTimerPanel(false);
                }}
                className="rounded border border-[var(--border-color)] px-2 py-0.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              >
                Hide
              </button>
            </div>
          )}

          {showStopwatchPanel && (
            <div className="flex flex-wrap items-center gap-2 rounded-md bg-[var(--bg-primary)] px-2.5 py-1.5 text-xs">
              <span className="flex items-center gap-1 font-medium uppercase tracking-wide text-[var(--text-muted)]">
                <Play className="h-3.5 w-3.5" />
                Stopwatch
              </span>
              <span className="min-w-[56px] font-mono text-sm text-[var(--text-primary)]">{formatClock(stopwatchSeconds)}</span>
              <button
                type="button"
                onClick={handleToggleStopwatchRunning}
                className="rounded border border-[var(--border-color)] px-2 py-0.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              >
                {stopwatchRunning ? "Pause" : "Start"}
              </button>
              <button
                type="button"
                onClick={handleResetStopwatch}
                className="rounded border border-[var(--border-color)] px-2 py-0.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => {
                  setStopwatchRunning(false);
                  setShowStopwatchPanel(false);
                }}
                className="rounded border border-[var(--border-color)] px-2 py-0.5 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              >
                Hide
              </button>
            </div>
          )}
        </div>
      )}

      <div className="monaco-container flex-1 rounded-none border-x border-[var(--border-color)]" style={{ minHeight: '400px' }}>
        <Editor
          onMount={handleEditorMount}
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
