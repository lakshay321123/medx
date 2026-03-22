import ChatMarkdown from "@/components/ChatMarkdown";

const PENDING_CONTAINER = "rounded-2xl p-4 text-left whitespace-normal max-w-3xl min-h-[48px] bg-[var(--so-card,#fff)] border border-[var(--so-border,#E5E5EA)] dark:bg-[var(--so-card,#1C1C1E)] dark:border-[var(--so-border,#2C2C2E)]";
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
      <div className={PENDING_CONTAINER}>
        <ChatMarkdown content={content || ""} formatId={formatId} userPrompt={userPrompt} />
      </div>
    );
  }

  const analyzingText = analyzingPhrase && analyzingPhrase.trim().length > 0 ? analyzingPhrase : "Analyzing your request…";
  const displayThinkingLabel = stripTrailingEllipsis(label);
  const displayAnalyzing = stripTrailingEllipsis(analyzingText);

  return (
    <div
      className={PENDING_CONTAINER}
      aria-live="polite"
    >
      <div className="flex min-h-[24px] flex-col justify-center gap-2 text-sm text-[var(--so-text-secondary,#8E8E93)] dark:text-[var(--so-text-secondary,#98989D)]">
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
