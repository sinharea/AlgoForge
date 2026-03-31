"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

type ChartCardProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
};

export default function ChartCard({ title, subtitle, action, children }: ChartCardProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#151827]/85 to-[#0f1220]/85 p-5 shadow-[0_20px_50px_-30px_rgba(59,130,246,.45)] backdrop-blur"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </motion.section>
  );
}
