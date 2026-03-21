"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { problemApi } from "@/src/api/problemApi";
import ProblemFilters from "@/src/features/problems/ProblemFilters";
import Loader from "@/src/components/ui/Loader";
import ErrorState from "@/src/components/ui/ErrorState";
import EmptyState from "@/src/components/ui/EmptyState";

export default function ProblemsPage() {
  const [filters, setFilters] = useState({ difficulty: "", tags: "", search: "" });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["problems", filters],
    queryFn: async () => (await problemApi.list(filters)).data,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Problems</h1>
      <ProblemFilters {...filters} onChange={setFilters} />

      {isLoading && <Loader />}
      {isError && <ErrorState message="Failed to load problems" />}
      {!isLoading && !isError && !data?.items?.length && <EmptyState title="No problems found" />}

      <div className="grid gap-3">
        {(data?.items || []).map((problem: any) => (
          <Link
            key={problem._id}
            href={`/problems/${problem.slug}`}
            className="rounded border border-slate-800 bg-slate-900 p-4 hover:border-violet-500"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">{problem.title}</div>
              <div className="text-sm text-slate-400">{problem.difficulty}</div>
            </div>
            <div className="mt-1 text-xs text-slate-500">{(problem.tags || []).join(", ")}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
