"use client";

import { clsx } from "clsx";

type BadgeProps = {
  children: React.ReactNode;
  variant?: "easy" | "medium" | "hard" | "success" | "error" | "warning" | "neutral";
  className?: string;
};

export default function Badge({ children, variant = "neutral", className }: BadgeProps) {
  return (
    <span
      className={clsx(
        "badge",
        variant === "easy" && "badge-easy",
        variant === "medium" && "badge-medium",
        variant === "hard" && "badge-hard",
        variant === "success" && "badge-success",
        variant === "error" && "badge-error",
        variant === "warning" && "bg-amber-500/15 text-amber-400",
        variant === "neutral" && "badge-neutral",
        className
      )}
    >
      {children}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const variant = difficulty.toLowerCase() as "easy" | "medium" | "hard";
  return <Badge variant={variant}>{difficulty}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const variant = status === "Accepted" ? "success" : status === "Wrong Answer" ? "error" : "warning";
  return <Badge variant={variant}>{status}</Badge>;
}
