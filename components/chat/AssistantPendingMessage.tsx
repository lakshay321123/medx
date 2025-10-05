import ChatMarkdown from "@/components/ChatMarkdown";
import type { PendingAssistantStage } from "@/hooks/usePendingAssistantStages";
import type { FormatId } from "@/lib/formats/types";

type Props = {
  stage: PendingAssistantStage;
  analyzingPhrase: string | null;
  thinkingLabel?: string | null;
  content: string;
  formatId?: FormatId;
  userPrompt?: string;
};

function stripTrailingEllipsis(value: string) {
  if (!value) return value;
  const trimmed = value.trimEnd();
  const withoutEllipsis = trimmed.replace(/(?:\u2026|\.\.{3})\s*$/u, "").trimEnd();
  return withoutEllipsis.length > 0 ? withoutEllipsis : trimmed;
}

export function AssistantPendingMessage({ stage, analyzingPhrase, thinkingLabel, content, formatId, userPrompt }: Props) {
  const fallbackLabel = stage === "reflecting" ? "Reflecting…" : "Analyzing";
  const label = thinkingLabel?.trim().length ? thinkingLabel : fallbackLabel;

  if (stage === "streaming") {
    return (
      <div className="rounded-2xl bg-white/90 dark:bg-zinc-900/60 p-4 text-left whitespace-normal max-w-3xl min-h-[64px]">
        <ChatMarkdown content={content || ""} formatId={formatId} userPrompt={userPrompt} />
      </div>
    );
  }

  const analyzingText = analyzingPhrase && analyzingPhrase.trim().length > 0 ? analyzingPhrase : "Analyzing your request…";
  const displayThinkingLabel = stripTrailingEllipsis(label);
  const displayAnalyzing = stripTrailingEllipsis(analyzingText);

  return (
    <div
      className="rounded-2xl bg-white/90 dark:bg-zinc-900/60 p-4 text-left whitespace-normal max-w-3xl min-h-[64px]"
      aria-live="polite"
    >
      <div className="flex min-h-[24px] flex-col justify-center gap-2 text-sm text-slate-600 dark:text-slate-300">
        {stage === "reflecting" ? (
          <span className="status-label status-label--breathe text-emerald-600 dark:text-emerald-300">{label}</span>
        ) : null}
        {stage === "thinking" ? (
          <span className="status-label status-label--dot">{displayThinkingLabel}</span>
        ) : null}
        {stage === "analyzing" ? (
          <span className="status-label status-label--dot" key={displayAnalyzing}>
            {displayAnalyzing}
          </span>
        ) : null}
      </div>
    </div>
  );
}
