"use client";

import { useState } from "react";

type CommentBoxProps = {
  placeholder?: string;
  submitLabel?: string;
  isSubmitting?: boolean;
  onSubmit: (content: string) => Promise<void> | void;
  onCancel?: () => void;
};

export default function CommentBox({
  placeholder = "Write your comment...",
  submitLabel = "Post",
  isSubmitting = false,
  onSubmit,
  onCancel,
}: CommentBoxProps) {
  const [content, setContent] = useState("");

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    await onSubmit(trimmed);
    setContent("");
  };

  return (
    <div className="space-y-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:outline-none"
      />

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={isSubmitting || content.trim().length === 0}
        >
          {isSubmitting ? "Posting..." : submitLabel}
        </button>
      </div>
    </div>
  );
}
