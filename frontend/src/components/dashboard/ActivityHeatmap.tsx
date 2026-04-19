"use client";

import { useMemo } from "react";

type DailyActivity = {
  date: string;
  submissionCount: number;
  acceptedCount: number;
  problemsSolved: number;
};

type Props = {
  data: DailyActivity[];
  year: number;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

const getColor = (count: number): string => {
  if (count === 0) return "bg-[var(--bg-tertiary)]";
  if (count === 1) return "bg-emerald-900/60";
  if (count <= 3) return "bg-emerald-700/70";
  if (count <= 6) return "bg-emerald-500/80";
  return "bg-emerald-400";
};

export default function ActivityHeatmap({ data, year }: Props) {
  const { weeks, monthLabels, totalSubmissions, totalActive } = useMemo(() => {
    const activityMap = new Map<string, DailyActivity>();
    for (const d of data) {
      const key = new Date(d.date).toISOString().slice(0, 10);
      activityMap.set(key, d);
    }

    const startDate = new Date(Date.UTC(year, 0, 1));
    const endDate = new Date(Date.UTC(year, 11, 31));
    const dayOffset = startDate.getUTCDay();

    const allWeeks: Array<Array<{ date: string; count: number } | null>> = [];
    let currentWeek: Array<{ date: string; count: number } | null> = [];

    // Pad first week
    for (let i = 0; i < dayOffset; i++) {
      currentWeek.push(null);
    }

    let totalSub = 0;
    let activeDays = 0;

    const cursor = new Date(startDate);
    const labels: Array<{ label: string; weekIndex: number }> = [];
    let lastMonth = -1;

    while (cursor <= endDate) {
      const key = cursor.toISOString().slice(0, 10);
      const month = cursor.getUTCMonth();

      if (month !== lastMonth) {
        labels.push({ label: MONTHS[month], weekIndex: allWeeks.length });
        lastMonth = month;
      }

      const activity = activityMap.get(key);
      const count = activity?.submissionCount || 0;
      totalSub += count;
      if (count > 0) activeDays++;

      currentWeek.push({ date: key, count });

      if (currentWeek.length === 7) {
        allWeeks.push(currentWeek);
        currentWeek = [];
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      allWeeks.push(currentWeek);
    }

    return {
      weeks: allWeeks,
      monthLabels: labels,
      totalSubmissions: totalSub,
      totalActive: activeDays,
    };
  }, [data, year]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--text-primary)]">{totalSubmissions}</span> submissions in {year}
          <span className="mx-2 text-[var(--text-muted)]">·</span>
          <span className="font-medium text-[var(--text-primary)]">{totalActive}</span> active days
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-0.5">
          {/* Month labels */}
          <div className="flex pl-8">
            {monthLabels.map((m, i) => (
              <span
                key={`${m.label}-${i}`}
                className="text-[10px] text-[var(--text-muted)]"
                style={{ position: "relative", left: `${m.weekIndex * 13}px` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex gap-0.5">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 pr-1">
              {DAYS.map((d, i) => (
                <span key={i} className="flex h-[11px] w-6 items-center text-[9px] text-[var(--text-muted)]">
                  {d}
                </span>
              ))}
            </div>

            {/* Grid */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day, di) => (
                  <div
                    key={`${wi}-${di}`}
                    className={`h-[11px] w-[11px] rounded-[2px] ${day ? getColor(day.count) : "bg-transparent"}`}
                    title={day ? `${day.date}: ${day.count} submissions` : ""}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-2 flex items-center gap-1 pl-8 text-[10px] text-[var(--text-muted)]">
            <span>Less</span>
            <div className="h-[11px] w-[11px] rounded-[2px] bg-[var(--bg-tertiary)]" />
            <div className="h-[11px] w-[11px] rounded-[2px] bg-emerald-900/60" />
            <div className="h-[11px] w-[11px] rounded-[2px] bg-emerald-700/70" />
            <div className="h-[11px] w-[11px] rounded-[2px] bg-emerald-500/80" />
            <div className="h-[11px] w-[11px] rounded-[2px] bg-emerald-400" />
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
