"use client";

import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/src/api/authApi";
import Loader from "@/src/components/ui/Loader";
import ErrorState from "@/src/components/ui/ErrorState";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";

export default function DashboardPage() {
  useProtectedRoute();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => (await authApi.meDashboard()).data,
  });

  if (isLoading) return <Loader />;
  if (isError) return <ErrorState message="Failed to load dashboard" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded border border-slate-800 bg-slate-900 p-4">
          <div className="text-sm text-slate-400">Total Solved</div>
          <div className="text-3xl font-semibold">{data.totalSolved}</div>
        </div>
        <div className="rounded border border-slate-800 bg-slate-900 p-4">
          <div className="text-sm text-slate-400">By Difficulty</div>
          <pre className="mt-2 text-sm">{JSON.stringify(data.byDifficulty, null, 2)}</pre>
        </div>
        <div className="rounded border border-slate-800 bg-slate-900 p-4">
          <div className="text-sm text-slate-400">Topic Progress</div>
          <pre className="mt-2 text-sm">{JSON.stringify(data.byTopic, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
