"use client";

import { clsx } from "clsx";
import CountUp from "react-countup";
import { LucideIcon } from "lucide-react";

type StatsCardProps = {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean };
  color?: "violet" | "emerald" | "amber" | "rose";
  suffix?: string;
};

const colorMap = {
  violet: {
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    icon: "text-violet-500",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    icon: "text-emerald-500",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    icon: "text-amber-500",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    icon: "text-rose-500",
  },
};

export default function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  color = "violet",
  suffix = "",
}: StatsCardProps) {
  const colors = colorMap[color];

  return (
    <div className="card group relative overflow-hidden">
      <div className={clsx("absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-20", colors.bg)} />
      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-[var(--text-secondary)]">{title}</span>
          <div className={clsx("rounded-lg p-2", colors.bg)}>
            <Icon className={clsx("h-4 w-4", colors.icon)} />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold">
            <CountUp end={value} duration={1.5} separator="," />
            {suffix}
          </span>
          {trend && (
            <span
              className={clsx(
                "mb-1 text-sm font-medium",
                trend.isPositive ? "text-emerald-400" : "text-rose-400"
              )}
            >
              {trend.isPositive ? "+" : "-"}
              {trend.value}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
