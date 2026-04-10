"use client";

import { FormEvent, useState } from "react";
import { Loader2, Send } from "lucide-react";

type MessageInputProps = {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
};

export default function MessageInput({
  onSend,
  disabled = false,
  placeholder = "Explain your approach or ask for a hint...",
}: MessageInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="input"
        placeholder={placeholder}
        disabled={disabled}
      />
      <button type="submit" disabled={disabled || !value.trim()} className="btn btn-primary min-w-[120px]">
        {disabled ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Thinking...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Send
          </>
        )}
      </button>
    </form>
  );
}
