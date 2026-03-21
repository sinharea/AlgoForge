"use client";

import { clsx } from "clsx";

type SkeletonProps = {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
};

export default function Skeleton({
  className,
  variant = "text",
  width,
  height,
}: SkeletonProps) {
  return (
    <div
      className={clsx(
        "skeleton",
        variant === "circular" && "rounded-full",
        variant === "text" && "h-4",
        className
      )}
      style={{
        width: width ?? (variant === "text" ? "100%" : undefined),
        height: height ?? (variant === "circular" ? width : undefined),
      }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="card space-y-4">
      <Skeleton height={24} width="60%" />
      <Skeleton height={16} width="40%" />
      <Skeleton height={48} />
    </div>
  );
}

export function ProblemListSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="card flex items-center justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton height={20} width="50%" />
            <Skeleton height={14} width="30%" />
          </div>
          <Skeleton height={24} width={60} className="rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card">
            <Skeleton height={16} width="50%" className="mb-2" />
            <Skeleton height={36} width="60%" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <Skeleton height={20} width="40%" className="mb-4" />
          <Skeleton height={200} />
        </div>
        <div className="card">
          <Skeleton height={20} width="40%" className="mb-4" />
          <Skeleton height={200} />
        </div>
      </div>
    </div>
  );
}

export function EditorSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton height={40} width={120} />
        <Skeleton height={40} width={100} />
      </div>
      <Skeleton height={420} className="rounded-xl" />
      <div className="card">
        <Skeleton height={16} width="30%" className="mb-2" />
        <Skeleton height={16} width="20%" />
      </div>
    </div>
  );
}
