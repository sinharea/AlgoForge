import Link from "next/link";

export default function Page() {
  return (
    <main className="relative min-h-screen bg-[#0b1220] text-white overflow-hidden">

      {/* Background animated glow */}
      <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-purple-600/20 blur-[180px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-250px] right-[-200px] w-[700px] h-[700px] bg-blue-600/20 blur-[150px] rounded-full animate-pulse"></div>

      {/* Content */}
      <div className="relative flex items-center justify-center min-h-screen px-6">
        <div className="text-center space-y-8 max-w-2xl">

          {/* Logo / Title */}
          <h1 className="text-7xl font-extrabold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent tracking-tight">
            AlgoForge
          </h1>

          {/* Tagline */}
          <p className="text-gray-400 text-xl leading-relaxed">
            Forge your competitive edge. Master algorithms. Dominate contests.
            Build speed. Build clarity. Build confidence.
          </p>

          {/* Buttons */}
          <div className="flex justify-center gap-6 pt-4">

            <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:scale-105 hover:opacity-95 rounded-xl font-semibold text-lg shadow-lg shadow-blue-600/30 transition-all duration-300">
              Start Coding
            </button>

            <Link
              href="/problems"
              className="px-8 py-4 border border-gray-600 hover:border-purple-400 hover:scale-105 rounded-xl font-semibold text-lg transition-all duration-300 inline-block"
            >
              Explore Problems
            </Link>

          </div>

        </div>
      </div>

    </main>
  );
}
