import { clsx } from "clsx";

type ChatBubbleProps = {
  role: "interviewer" | "user";
  content: string;
  timestamp?: string;
};

const formatTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function ChatBubble({ role, content, timestamp }: ChatBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={clsx("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          "max-w-[90%] rounded-2xl border px-4 py-3 text-sm leading-relaxed md:max-w-[75%]",
          isUser
            ? "border-cyan-500/30 bg-cyan-500/15 text-cyan-50"
            : "border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
        )}
      >
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          {isUser ? "You" : "Interviewer"}
        </div>
        <p className="whitespace-pre-wrap">{content}</p>
        {timestamp ? <p className="mt-2 text-right text-[11px] text-[var(--text-muted)]">{formatTime(timestamp)}</p> : null}
      </div>
    </div>
  );
}
