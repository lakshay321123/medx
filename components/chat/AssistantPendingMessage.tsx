import { useCallback, useEffect, useRef, useState } from "react";
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

const CHARS_PER_TICK = 6;
const TICK_MS = 12;

export function AssistantPendingMessage({ stage, analyzingPhrase, thinkingLabel, content, formatId, userPrompt }: Props) {
  const fallbackLabel = stage === "reflecting" ? "Reflecting…" : "Analyzing";
  const label = thinkingLabel?.trim().length ? thinkingLabel : fallbackLabel;
  const [visibleText, setVisibleText] = useState("");
  const netBufRef = useRef("");
  const pumpActiveRef = useRef(false);
  const destroyedRef = useRef(false);
  const fullContentRef = useRef("");

  const resetAll = useCallback((text: string) => {
    netBufRef.current = "";
    pumpActiveRef.current = false;
    fullContentRef.current = text;
    setVisibleText(text);
  }, []);

  const pumpTypewriter = useCallback(() => {
    if (pumpActiveRef.current) return;
    pumpActiveRef.current = true;

    const step = () => {
      if (destroyedRef.current) return;

      const out = netBufRef.current.slice(0, CHARS_PER_TICK);
      netBufRef.current = netBufRef.current.slice(CHARS_PER_TICK);
      if (out) {
        setVisibleText(prev => prev + out);
      }

      if (netBufRef.current.length > 0) {
        window.setTimeout(step, TICK_MS);
      } else {
        pumpActiveRef.current = false;
      }
    };

    window.setTimeout(step, 0);
  }, []);

  useEffect(() => {
    destroyedRef.current = false;
    return () => {
      destroyedRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (stage !== "streaming") {
      resetAll(content || "");
      return;
    }

    const full = content || "";
    const previous = fullContentRef.current;
    if (full.length < previous.length) {
      // Reset requested mid-stream (e.g., medx_reset).
      setVisibleText("");
      netBufRef.current = "";
      pumpActiveRef.current = false;
      fullContentRef.current = "";
    }

    const startIndex = fullContentRef.current.length;
    if (full.length > startIndex) {
      netBufRef.current += full.slice(startIndex);
      fullContentRef.current = full;
      pumpTypewriter();
    }
  }, [content, stage, pumpTypewriter, resetAll]);

  if (stage === "streaming") {
    return (
      <div className="rounded-2xl bg-white/90 dark:bg-zinc-900/60 p-4 text-left whitespace-normal max-w-3xl min-h-[64px]">
        <div className="font-sans whitespace-pre-wrap text-[14px] leading-6">
          {visibleText}
        </div>
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
