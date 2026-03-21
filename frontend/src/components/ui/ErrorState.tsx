"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = {
  message: string;
  onRetry?: () => void;
};

export default function ErrorState({ message, onRetry }: Props) {
  return (
    <div className="card flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-full bg-rose-500/10 p-4">
        <AlertTriangle className="h-8 w-8 text-rose-400" />
      </div>
      <h3 className="text-lg font-semibold">Something went wrong</h3>
      <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn btn-secondary mt-6"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      )}
    </div>
  );
}
