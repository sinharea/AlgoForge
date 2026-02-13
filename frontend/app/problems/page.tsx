"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Problem {
  _id: string;
  title: string;
  difficulty: string;
  slug: string; // ✅ IMPORTANT
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/problems")
      .then((res) => res.json())
      .then((data) => {
        setProblems(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const difficultyStyle = (level: string) => {
    if (level === "Easy") return "text-green-400";
    if (level === "Medium") return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <main className="relative min-h-screen bg-[#0b1220] text-white overflow-hidden px-8 py-24">

      <div className="max-w-6xl mx-auto space-y-12">

        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Problem Arena
          </h1>
          <p className="text-gray-400">
            Solve real problems. Sharpen your edge.
          </p>
        </div>

        {/* Problems List */}
        {loading ? (
          <p className="text-gray-400 text-center">Loading problems...</p>
        ) : (
          <div className="grid gap-6">
            {problems.map((problem) => (
              <Link
                key={problem._id}
                href={`/problems/${problem.slug}`}  //  USE SLUG
              >
                <div className="group p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-purple-500 transition-all duration-300 cursor-pointer hover:scale-[1.02]">

                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold group-hover:text-purple-400 transition-colors">
                      {problem.title}
                    </h2>

                    <span className={`font-medium ${difficultyStyle(problem.difficulty)}`}>
                      {problem.difficulty}
                    </span>
                  </div>

                </div>
              </Link>
            ))}
          </div>
        )}

      </div>

    </main>
  );
}
