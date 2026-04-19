"use client";

import { LucideIcon } from "lucide-react";
import CountUp from "react-countup";
import { motion } from "framer-motion";

type StatCardProps = {
  title: string;
  value: number;
  icon?: LucideIcon;
  tooltip: string;
  tone: "violet" | "emerald" | "amber" | "rose";
};

const toneStyles = {
  violet: {
    ring: "from-[#c4a56b]/45 to-[#8f6f3b]/30",
    icon: "bg-[#e6d2aa] text-[#6d5328]",
  },
  emerald: {
    ring: "from-[#6d9b80]/35 to-[#44705a]/25",
    icon: "bg-[#d6eadf] text-[#2f6f4e]",
  },
  amber: {
    ring: "from-[#d5a467]/38 to-[#a86f2f]/25",
    icon: "bg-[#f0dec7] text-[#8c5c26]",
  },
  rose: {
    ring: "from-[#cb9088]/35 to-[#9e3d3d]/25",
    icon: "bg-[#f2ddda] text-[#8b3b3b]",
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
      className="group relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4 shadow-[0_12px_30px_-20px_rgba(77,57,26,0.38)]"
    >
      <div
        className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br ${style.ring}`}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">
            <CountUp end={value} duration={1.2} separator="," />
          </p>
        </div>
        <div className={`rounded-xl p-2.5 ${style.icon}`}>
          {Icon && <Icon className="h-5 w-5" />}
        </div>
      </div>
    </motion.article>
  );
}
