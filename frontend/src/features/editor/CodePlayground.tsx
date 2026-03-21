"use client";

import Editor from "@monaco-editor/react";

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
  };
};

export default function CodePlayground({
  language,
  code,
  setCode,
  setLanguage,
  onSubmit,
  submitting,
  result,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-2"
        >
          <option value="cpp">C++</option>
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
        </select>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="rounded bg-emerald-600 px-4 py-2 hover:bg-emerald-500 disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>

      <div className="h-[420px] overflow-hidden rounded border border-slate-800">
        <Editor
          height="100%"
          language={language === "cpp" ? "cpp" : language}
          value={code}
          onChange={(v) => setCode(v || "")}
          theme="vs-dark"
          options={{ minimap: { enabled: false }, fontSize: 14 }}
        />
      </div>

      <div className="rounded border border-slate-800 bg-slate-900 p-4 text-sm">
        <div>Status: {result?.verdict || "-"}</div>
        <div>Runtime: {result?.runtime ?? "-"} ms</div>
        <pre className="mt-3 whitespace-pre-wrap text-emerald-300">{result?.output || ""}</pre>
        <pre className="mt-2 whitespace-pre-wrap text-rose-300">{result?.error || ""}</pre>
      </div>
    </div>
  );
}
