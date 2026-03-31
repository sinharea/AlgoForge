"use client";

import { motion } from "framer-motion";
import { Building2, Flame } from "lucide-react";
import { clsx } from "clsx";

type CompanyItem = {
  name: string;
  mentions: number;
};

type Props = {
  companies: CompanyItem[];
  activeCompanies: string[];
  onToggleCompany: (company: string) => void;
};

export default function CompanySidebar({ companies, activeCompanies, onToggleCompany }: Props) {
  return (
    <aside className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-4 shadow-[0_22px_48px_-36px_rgba(15,118,110,0.95)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-300" />
          <h3 className="text-sm font-semibold tracking-wide text-[var(--text-primary)]">
            Trending Companies
          </h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-[var(--text-muted)]">
          Hot
        </span>
      </div>

      <div className="space-y-2">
        {companies.map((company) => {
          const isActive = activeCompanies.includes(company.name);

          return (
            <motion.button
              key={company.name}
              type="button"
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onToggleCompany(company.name)}
              className={clsx(
                "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition",
                isActive
                  ? "border-cyan-300/60 bg-cyan-400/15 text-cyan-100"
                  : "border-white/10 bg-[var(--bg-secondary)]/70 text-[var(--text-secondary)] hover:border-white/25 hover:text-[var(--text-primary)]"
              )}
            >
              <span className="inline-flex items-center gap-2 text-sm font-medium">
                <Building2 className="h-4 w-4" />
                {company.name}
              </span>
              <span className="text-xs opacity-85">{company.mentions}</span>
            </motion.button>
          );
        })}
      </div>
    </aside>
  );
}
