"use client";

import { motion } from "framer-motion";
import { Hash } from "lucide-react";
import { clsx } from "clsx";

type Props = {
  topics: string[];
  activeTopics: string[];
  onToggleTopic: (topic: string) => void;
};

export default function TagBar({ topics, activeTopics, onToggleTopic }: Props) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] p-3">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <Hash className="h-4 w-4" />
          <span>Topic Tags</span>
        </div>
        <span className="text-xs text-[var(--text-muted)]">Scroll horizontally</span>
      </div>

      <div className="overflow-x-auto pb-2 scroll-smooth">
        <div className="flex min-w-max items-center gap-2">
          {topics.map((topic) => {
            const isActive = activeTopics.includes(topic);
            return (
              <motion.button
                whileTap={{ scale: 0.94 }}
                whileHover={{ y: -1 }}
                type="button"
                key={topic}
                onClick={() => onToggleTopic(topic)}
                className={clsx(
                  "rounded-full border px-3 py-1.5 text-sm transition",
                  isActive
                    ? "border-[#b89457]/60 bg-[#f1e4cb] text-[#7a5b2b]"
                    : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]"
                )}
              >
                {topic}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
