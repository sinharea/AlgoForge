"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { userApi } from "@/src/api/userApi";

export default function WeaknessComparison() {
  const query = useQuery({
    queryKey: ["weakness-comparison"],
    queryFn: async () => (await userApi.weaknessComparison()).data,
    retry: 1,
  });

  if (query.isLoading) return null;

  // Backend returns {current: {weakTopicCount, avgWeakAccuracy, ...}, previous: {topicSnapshots, ...} | null}
  const raw = query.data;
  if (!raw || !raw.current) return null;

  const current = raw.current;
  const previous = raw.previous;

  // Build comparison data from snapshots if available
  const comparisons: Array<{
    label: string;
    currentValue: number;
    previousValue: number;
    delta: number;
  }> = [];

  if (previous?.topicSnapshots?.length) {
    // If previous has per-topic data, compare
    for (const snap of previous.topicSnapshots) {
      comparisons.push({
        label: snap.topic,
        currentValue: snap.accuracy, // will be overridden below if current has data
        previousValue: snap.accuracy,
        delta: 0,
      });
    }
  }

  // Always add summary comparison
  const prevAcc = previous?.avgWeakAccuracy ?? 0;
  const currAcc = current?.avgWeakAccuracy ?? 0;

  const summaryComparisons = [
    {
      label: "Weak Topic Count",
      currentValue: current.weakTopicCount ?? 0,
      previousValue: previous?.weakTopicCount ?? 0,
      delta: (previous?.weakTopicCount ?? 0) - (current.weakTopicCount ?? 0), // fewer weak topics = improvement
    },
    {
      label: "Avg Weak Accuracy",
      currentValue: currAcc,
      previousValue: prevAcc,
      delta: currAcc - prevAcc,
    },
    {
      label: "Avg Weak Attempts",
      currentValue: current.avgWeakAttempts ?? 0,
      previousValue: previous?.avgWeakAttempts ?? 0,
      delta: (current.avgWeakAttempts ?? 0) - (previous?.avgWeakAttempts ?? 0),
    },
  ];

  if (!previous) {
    return (
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-5 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">Month-over-Month</h3>
          <p className="text-sm text-[var(--text-secondary)]">No previous month data to compare yet.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Month-over-Month</h3>
        <p className="text-sm text-[var(--text-secondary)]">How your weaknesses changed vs last month</p>
      </div>

      <div className="space-y-2.5">
        {summaryComparisons.map((c) => {
          const improved = c.delta > 0;
          const declined = c.delta < 0;

          return (
            <div
              key={c.label}
              className="flex items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-2"
            >
              <span className="text-sm font-medium text-[var(--text-primary)]">{c.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-muted)]">
                  {c.previousValue.toFixed(1)} → {c.currentValue.toFixed(1)}
                </span>
                <span
                  className={`flex items-center gap-0.5 text-xs font-medium ${
                    improved ? "text-emerald-400" : declined ? "text-rose-400" : "text-[var(--text-muted)]"
                  }`}
                >
                  {improved ? <ArrowUp className="h-3 w-3" /> : declined ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                  {Math.abs(c.delta).toFixed(1)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
