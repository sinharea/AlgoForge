"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import toast from "react-hot-toast";
import { contestApi } from "@/src/api/contestApi";
import Loader from "@/src/components/ui/Loader";
import ErrorState from "@/src/components/ui/ErrorState";
import useProtectedRoute from "@/src/hooks/useProtectedRoute";

export default function ContestsPage() {
  useProtectedRoute();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["contests"],
    queryFn: async () => (await contestApi.list()).data,
  });

  if (isLoading) return <Loader />;
  if (isError) return <ErrorState message="Failed to load contests" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Contests</h1>
      {(data || []).map((contest: any) => (
        <div key={contest._id} className="rounded border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{contest.title}</h2>
              <p className="text-sm text-slate-400">{contest.state}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    await contestApi.register(contest._id);
                    toast.success("Registered");
                    refetch();
                  } catch (error: any) {
                    toast.error(error?.response?.data?.message || "Register failed");
                  }
                }}
                className="rounded bg-violet-600 px-3 py-1.5 text-sm"
              >
                Register
              </button>
              <Link
                href={`/contests/${contest._id}/leaderboard`}
                className="rounded border border-slate-700 px-3 py-1.5 text-sm"
              >
                Leaderboard
              </Link>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
