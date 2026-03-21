"use client";

import { Loader2 } from "lucide-react";
import { clsx } from "clsx";

type Props = {
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
  text?: string;
};

export default function Loader({ size = "md", fullScreen = false, text }: Props) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className={clsx("animate-spin text-[var(--accent-secondary)]", sizeClasses[size])} />
      {text && <p className="text-sm text-[var(--text-secondary)]">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-primary)]/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return (
    <div className="flex min-h-[200px] items-center justify-center">
      {content}
    </div>
  );
}
