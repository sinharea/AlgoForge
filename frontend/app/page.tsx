import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">AlgoForge</h1>
      <p className="max-w-2xl text-slate-300">
        Production-grade coding platform with secure auth, async judging, contests, recommendations, and Docker-based isolated execution.
      </p>
      <div className="flex gap-3">
        <Link href="/problems" className="rounded bg-violet-600 px-4 py-2">Start Solving</Link>
        <Link href="/dashboard" className="rounded border border-slate-700 px-4 py-2">Dashboard</Link>
      </div>
    </div>
  );
}
