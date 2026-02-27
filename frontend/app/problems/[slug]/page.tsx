"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Editor from "@monaco-editor/react";

interface Problem {
  title: string;
  slug: string;
  description: string;
  difficulty: string;
  constraints: string;
  sampleTestCases: {
    input: string;
    expectedOutput: string;
  }[];
}

const templates: Record<string, string> = {
  javascript: `function solve(nums) {
  // Write your logic here
  
  
}

module.exports = solve;`,

  python: `def solve(nums):
    # Write your logic here
    
    
if __name__ == "__main__":
    pass`,

  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    // Write your logic here
    
    
    return 0;
}`,

  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Write your logic here
        
        
    }
}`,
};

export default function ProblemDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [problem, setProblem] = useState<Problem | null>(null);
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState(templates["javascript"]);
  const [output, setOutput] = useState("");

  useEffect(() => {
    fetch(`http://localhost:5000/api/problems/slug/${slug}`)
      .then((res) => res.json())
      .then((data) => setProblem(data))
      .catch(() => setProblem(null));
  }, [slug]);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setCode(templates[lang]);
  };

  if (!problem) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b1220] text-white">
        Loading...
      </div>
    );
  }

  const difficultyColor =
    problem.difficulty === "Easy"
      ? "text-green-400"
      : problem.difficulty === "Medium"
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <main className="relative min-h-screen bg-[#0b1220] text-white overflow-hidden flex">

      {/* Animated Background Glow */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-purple-600/20 blur-[180px] rounded-full animate-pulse"></div>

      {/* LEFT PANEL */}
      <div className="relative w-2/5 p-10 overflow-y-auto border-r border-white/10 backdrop-blur-xl bg-white/5">

        <h1 className="text-4xl font-extrabold mb-2 tracking-wide">
          {problem.title}
        </h1>

        <p className={`mb-6 font-medium ${difficultyColor}`}>
          {problem.difficulty}
        </p>

        <div className="space-y-8">

          <div>
            <h2 className="text-lg font-semibold mb-2 text-purple-300">
              Description
            </h2>
            <p className="text-gray-300 leading-relaxed">
              {problem.description}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2 text-purple-300">
              Constraints
            </h2>
            <p className="text-gray-400">
              {problem.constraints}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-4 text-purple-300">
              Sample Test Cases
            </h2>

            {problem.sampleTestCases.map((test, index) => (
              <div
                key={index}
                className="bg-black/40 border border-white/10 p-5 rounded-xl mb-4 hover:border-purple-500/40 transition-all duration-300"
              >
                <p className="text-sm text-gray-400 mb-1">Input</p>
                <pre className="text-green-400">{test.input}</pre>

                <p className="text-sm text-gray-400 mt-3 mb-1">Output</p>
                <pre className="text-blue-400">{test.expectedOutput}</pre>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="relative w-3/5 flex flex-col bg-[#0f172a]">

        {/* Editor Top Bar */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-[#11183a]">

          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-[#1e293b] px-4 py-2 rounded-lg border border-white/10 hover:border-purple-400 transition"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
          </select>

          <div className="flex gap-4">
            <button
              onClick={() => setOutput("Running...")}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition hover:scale-105"
            >
              Run
            </button>

            <button
              onClick={() => setOutput("Submitted Successfully")}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 rounded-lg transition hover:scale-105"
            >
              Submit
            </button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 border-t border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
          <Editor
            height="100%"
            theme="vs-dark"
            language={language}
            value={code}
            onChange={(value) => setCode(value || "")}
            options={{
              fontSize: 14,
              minimap: { enabled: false },
              smoothScrolling: true,
            }}
          />
        </div>

        {/* Output Console */}
        <div className="h-40 bg-black/60 border-t border-white/10 p-4 overflow-y-auto">
          <p className="text-sm text-gray-400 mb-2">Console Output</p>
          <pre className="text-green-400">{output}</pre>
        </div>

      </div>

    </main>
  );
}
