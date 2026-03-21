"use client";

import { LucideIcon, Inbox } from "lucide-react";

type Props = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export default function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: Props) {
  return (
    <div className="card flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-full bg-[var(--bg-tertiary)] p-4">
        <Icon className="h-8 w-8 text-[var(--text-muted)]" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">{description}</p>
      )}
      {action && (
        <button onClick={action.onClick} className="btn btn-primary mt-6">
          {action.label}
        </button>
      )}
    </div>
  );
}
