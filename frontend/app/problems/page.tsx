"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Problem {
  _id: string;
  title: string;
  slug: string;
  difficulty: string;
}

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(5 * 60 * 60); // 5h countdown

  useEffect(() => {
    fetch("http://localhost:5000/api/problems")
      .then((res) => res.json())
      .then((data) => {
        setProblems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    return `${String(h).padStart(2, "0")}:${String(m).padStart(
      2,
      "0"
    )}:${String(s).padStart(2, "0")}`;
  };

  const difficultyColor = (level: string) => {
    if (level === "Easy") return "text-green-400";
    if (level === "Medium") return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <main className="relative min-h-screen bg-[#0b1220] text-white overflow-hidden">

      {/* Background Glow */}
      <div className="absolute top-[-300px] left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-purple-600/20 blur-[200px] rounded-full"></div>

      <div className="relative max-w-6xl mx-auto px-8 py-24 space-y-16">

        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Problem Arena
          </h1>
          <p className="text-gray-400 text-lg">
            Solve real problems. Sharpen your edge.
          </p>
        </div>

        {/* Contest Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-400/20 rounded-2xl p-8 backdrop-blur-xl shadow-lg">

          {/* Moving Rocket */}
          <div className="absolute top-1/2 -translate-y-1/2 left-[-120px] text-4xl animate-rocket">
            🚀
          </div>

          <div className="flex justify-between items-center relative z-10">
            <div>
              <h2 className="text-xl font-semibold">
                Weekly Contest
              </h2>
              <p className="text-gray-400 text-sm">
                Compete. Climb. Conquer.
              </p>
            </div>

            <div className="text-3xl font-mono text-pink-400">
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-10 text-center">

          <div className="bg-white/5 border border-white/10 rounded-2xl p-10 backdrop-blur-md hover:scale-110 transition duration-300 cursor-default">
            <p className="text-gray-400 text-sm">Total Problems</p>
            <p className="text-4xl font-bold text-blue-400 mt-2">
              {problems.length}
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-10 backdrop-blur-md hover:scale-110 transition duration-300 cursor-default">
            <p className="text-gray-400 text-sm">Solved</p>
            <p className="text-4xl font-bold text-green-400 mt-2">
              1
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-10 backdrop-blur-md hover:scale-110 transition duration-300 cursor-default">
            <p className="text-gray-400 text-sm">Current Streak</p>
            <p className="text-4xl font-bold text-purple-400 mt-2">
              5 days
            </p>
          </div>

        </div>

        {/* Problems List */}
        {loading ? (
          <p className="text-gray-400 text-center">
            Loading problems...
          </p>
        ) : (
          <div className="space-y-16">

            {problems.map((problem) => (
              <Link key={problem._id} href={`/problems/${problem.slug}`}>
                <div className="group p-10 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md hover:border-purple-400/40 hover:bg-white/10 transition-all duration-300 cursor-pointer hover:scale-[1.03] shadow-lg">

                  <div className="flex justify-between items-center">

                    <h2 className="text-2xl font-semibold group-hover:text-purple-400 transition-colors">
                      {problem.title}
                    </h2>

                    <span className={`font-semibold ${difficultyColor(problem.difficulty)}`}>
                      {problem.difficulty}
                    </span>

                  </div>

                </div>
              </Link>
            ))}

          </div>
        )}

      </div>

      {/* Rocket Animation */}
      <style jsx global>{`
        @keyframes rocket {
          0% {
            transform: translate(-120px, -50%);
          }
          100% {
            transform: translate(calc(100vw + 200px), -50%);
          }
        }

        .animate-rocket {
          animation: rocket 8s linear infinite;
        }
      `}</style>

    </main>
  );
}
