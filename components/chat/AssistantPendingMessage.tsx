import { AnimatedDot } from "@/components/chat/AnimatedDot";
import ChatMarkdown from "@/components/ChatMarkdown";
import type { PendingAssistantStage } from "@/hooks/usePendingAssistantStages";

type Props = {
  stage: PendingAssistantStage;
  analyzingPhrase: string | null;
  thinkingLabel?: string | null;
  content: string;
};

export function AssistantPendingMessage({ stage, analyzingPhrase, thinkingLabel, content }: Props) {
  const label = thinkingLabel?.trim().length ? thinkingLabel : "Working…";

  if (stage === "streaming") {
    return (
      <div className="rounded-2xl bg-white/90 dark:bg-zinc-900/60 p-4 text-left whitespace-normal max-w-3xl min-h-[64px]">
        <ChatMarkdown content={content || ""} />
      </div>
    );
  }

  const analyzingText = analyzingPhrase && analyzingPhrase.trim().length > 0 ? analyzingPhrase : "Analyzing your request…";

  return (
    <div
      className="rounded-2xl bg-white/90 dark:bg-zinc-900/60 p-4 text-left whitespace-normal max-w-3xl min-h-[64px]"
      aria-live="polite"
    >
      <div className="flex min-h-[24px] flex-col justify-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        {stage === "reflecting" ? (
          <div className="inline-flex items-center text-emerald-600 dark:text-emerald-300">
            <span className="sr-only">{label}</span>
            <span
              aria-hidden="true"
              className="motion-safe:animate-[pulse_1.4s_ease-in-out_infinite] motion-reduce:animate-none"
            >
              {label}
            </span>
          </div>
        ) : null}
        {stage === "thinking" ? (
          <div className="flex items-center gap-2">
            <AnimatedDot label={label} />
          </div>
        ) : null}
        {stage === "analyzing" ? (
          <div className="transition-opacity duration-200" key={analyzingText}>
            <span className="sr-only">Analyzing request…</span>
            <span aria-hidden="true">{analyzingText}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
