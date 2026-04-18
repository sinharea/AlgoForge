import { clsx } from "clsx";
import { Bot, User } from "lucide-react";

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
    <div className={clsx("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}>
      <div
        className={clsx(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
          isUser
            ? "border-cyan-500/30 bg-cyan-500/15 text-cyan-300"
            : "border-violet-500/30 bg-violet-500/15 text-violet-300"
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div
        className={clsx(
          "max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-relaxed md:max-w-[75%]",
          isUser
            ? "rounded-tr-sm border-cyan-500/20 bg-cyan-500/10 text-cyan-50"
            : "rounded-tl-sm border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
        )}
      >
        <p className="whitespace-pre-wrap">{content}</p>
        {timestamp && (
          <p className={clsx("mt-1.5 text-[10px]", isUser ? "text-right text-cyan-300/50" : "text-left text-[var(--text-muted)]")}>
            {formatTime(timestamp)}
          </p>
        )}
      </div>
    </div>
  );
}
