import { AnimatedDot } from "@/components/chat/AnimatedDot";
import ChatMarkdown from "@/components/ChatMarkdown";
import type { PendingAssistantStage } from "@/hooks/usePendingAssistantStages";

export function AssistantPendingMessage({
  stage,
  analyzingPhrase,
  content,
}: {
  stage: PendingAssistantStage;
  analyzingPhrase: string | null;
  content: string;
}) {
  const showThinking = stage === "thinking";
  const showAnalyzing = stage === "analyzing";
  const showStreaming = stage === "streaming";

  return (
    <div
      className="rounded-2xl bg-white/90 dark:bg-zinc-900/60 p-4 text-left whitespace-normal max-w-3xl min-h-[64px]"
      aria-live="polite"
    >
      {showStreaming ? (
        <ChatMarkdown content={content || ""} />
      ) : (
        <div className="flex min-h-[24px] flex-col justify-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          {showThinking ? (
            <div className="flex items-center gap-2">
              <AnimatedDot ariaHidden />
              <span className="sr-only">Preparing response…</span>
            </div>
          ) : null}
          {showAnalyzing ? (
            <div className="transition-opacity duration-200" key={analyzingPhrase ?? "analyzing"}>
              <span className="sr-only">Analyzing request…</span>
              <span aria-hidden="true">{analyzingPhrase ?? ""}</span>
            </div>
          ) : null}
          {!showThinking && !showAnalyzing ? (
            <div className="flex items-center gap-2">
              <AnimatedDot ariaHidden />
              <span className="sr-only">Working…</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
