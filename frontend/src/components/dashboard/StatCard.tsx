"use client";

import { LucideIcon } from "lucide-react";
import CountUp from "react-countup";
import { motion } from "framer-motion";

type StatCardProps = {
  title: string;
  value: number;
  icon: LucideIcon;
  tooltip: string;
  tone: "violet" | "emerald" | "amber" | "rose";
};

const toneStyles = {
  violet: {
    ring: "from-violet-500/35 to-blue-500/30",
    icon: "bg-violet-500/20 text-violet-300",
  },
  emerald: {
    ring: "from-emerald-500/35 to-teal-500/30",
    icon: "bg-emerald-500/20 text-emerald-300",
  },
  amber: {
    ring: "from-amber-500/35 to-orange-500/30",
    icon: "bg-amber-500/20 text-amber-300",
  },
  rose: {
    ring: "from-rose-500/35 to-red-500/30",
    icon: "bg-rose-500/20 text-rose-300",
  },
};

export default function StatCard({ title, value, icon: Icon, tooltip, tone }: StatCardProps) {
  const style = toneStyles[tone];

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.25 }}
      title={tooltip}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#111424]/90 p-4 shadow-[0_12px_38px_-24px_rgba(37,99,235,.9)]"
    >
      <div
        className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br ${style.ring}`}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-white">
            <CountUp end={value} duration={1.2} separator="," />
          </p>
        </div>
        <div className={`rounded-xl p-2.5 ${style.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.article>
  );
}
