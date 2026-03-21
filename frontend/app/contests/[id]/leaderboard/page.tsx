"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { contestApi } from "@/src/api/contestApi";
import Loader from "@/src/components/ui/Loader";
import ErrorState from "@/src/components/ui/ErrorState";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";

export default function ContestLeaderboardPage() {
  useProtectedRoute();
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["leaderboard", id],
    queryFn: async () => (await contestApi.leaderboard(id)).data,
    enabled: Boolean(id),
    refetchInterval: 10000,
  });

  if (isLoading) return <Loader />;
  if (isError) return <ErrorState message="Failed to load leaderboard" />;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">Leaderboard</h1>
      <div className="overflow-hidden rounded border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900">
            <tr>
              <th className="px-4 py-2">Rank</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Score</th>
              <th className="px-4 py-2">Penalty</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((row: any, index: number) => (
              <tr key={row.userId} className="border-t border-slate-800 bg-slate-950">
                <td className="px-4 py-2">{index + 1}</td>
                <td className="px-4 py-2">{row.name}</td>
                <td className="px-4 py-2">{row.score}</td>
                <td className="px-4 py-2">{row.penalty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
