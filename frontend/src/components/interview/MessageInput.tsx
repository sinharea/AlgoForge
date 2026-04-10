"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Mic, Send, Square } from "lucide-react";

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
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const supportsSpeechRecognition = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition);
  }, []);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors from rapidly toggled recognizers.
      }
    }
    setListening(false);
  }, []);

  const handleToggleSpeech = useCallback(() => {
    if (disabled || !supportsSpeechRecognition) return;

    if (listening) {
      stopRecognition();
      return;
    }

    const RecognitionCtor = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!RecognitionCtor) return;

    const recognition = new RecognitionCtor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = String(event?.results?.[0]?.[0]?.transcript || "").trim();
      if (!transcript) return;
      setValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [disabled, listening, stopRecognition, supportsSpeechRecognition]);

  useEffect(() => {
    if (disabled && listening) {
      stopRecognition();
    }
  }, [disabled, listening, stopRecognition]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore teardown errors.
        }
      }
    };
  }, []);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="input"
          placeholder={placeholder}
          disabled={disabled}
        />

        <button
          type="button"
          onClick={handleToggleSpeech}
          disabled={disabled || !supportsSpeechRecognition}
          className="btn btn-secondary min-w-[120px]"
        >
          {listening ? (
            <>
              <Square className="h-4 w-4" />
              Listening...
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              🎤 Speak
            </>
          )}
        </button>

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
      </div>

      {listening ? <p className="text-xs text-[var(--text-secondary)]">Listening...</p> : null}
      {!supportsSpeechRecognition ? (
        <p className="text-xs text-[var(--text-muted)]">Speech input is not supported in this browser.</p>
      ) : null}
    </form>
  );
}
