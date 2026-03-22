import { useMemo } from "react";

import { useT } from "@/components/hooks/useI18n";
import { SUGGESTION_LABELS_EN } from "@/data/suggestions";
import { isAction, Suggestion } from "@/lib/chat/suggestions";

type Props = { suggestions: Suggestion[]; onAction: (s: Suggestion) => void };

// Detect if a question has selectable options ("X or Y?")
function extractOptions(label: string): string[] | null {
  const orMatch = label.match(/\b(\w[\w\s]*?)\s+or\s+(\w[\w\s]*?)\??$/i);
  if (orMatch) {
    return [orMatch[1].trim(), orMatch[2].trim().replace(/\?$/, "")];
  }
  return null;
}

// Detect if a question is open-ended (needs typed answer, not a click)
function isOpenEnded(label: string): boolean {
  const q = label.toLowerCase();
  // Open-ended patterns: "what...", "any...", "how...", "describe...", "tell me..."
  if (/^(what|any|how|describe|tell me|share|list|which specific|do you have)/.test(q)) return true;
  // Questions asking for specific input
  if (/prefer|tried|currently|taking|experience|history|detail/.test(q)) return true;
  return false;
}

export default function SuggestionChips({ suggestions, onAction }: Props) {
  if (!suggestions?.length) return null;

  const safe = suggestions.map((s) => (s.actionId ? s : { ...s, actionId: undefined }));
  const t = useT();

  const translated = useMemo(
    () =>
      safe.map((s) => {
        const translatedLabel = t(s.label);
        const fallback =
          translatedLabel === s.label
            ? SUGGESTION_LABELS_EN[s.label as keyof typeof SUGGESTION_LABELS_EN] ?? s.label
            : translatedLabel;
        return { ...s, label: fallback } as Suggestion;
      }),
    [safe, t],
  );

  return (
    <div className="mt-4 pt-3 border-t border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] space-y-2">
      {translated.map((s) => {
        const options = extractOptions(s.label);
        const openEnded = isOpenEnded(s.label);
        
        // Type 1: Question with selectable options ("patchy or diffuse?")
        if (options && options.length >= 2 && !openEnded) {
          return (
            <div key={s.id} className="space-y-1.5">
              <p className="text-[14px] font-medium text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]">
                {s.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    className="rounded-full border border-[var(--so-accent,#06B6D4)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--so-accent,#06B6D4)] transition hover:bg-[var(--so-accent,#06B6D4)] hover:text-white dark:border-[#22D3EE] dark:text-[#22D3EE] dark:hover:bg-[#22D3EE] dark:hover:text-black"
                    onClick={() => onAction({ id: `${s.id}-opt-${i}`, label: `${opt.charAt(0).toUpperCase() + opt.slice(1)} — answering: ${s.label}` } as Suggestion)}
                  >
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </button>
                ))}
                <button
                  type="button"
                  className="rounded-full border border-[var(--so-border,#E5E5EA)] px-3.5 py-1.5 text-[13px] text-[var(--so-text-secondary,#8E8E93)] transition hover:bg-[var(--so-bg-secondary,#F2F2F7)] dark:border-[var(--so-border,#2C2C2E)] dark:hover:bg-[#2C2C2E]"
                  onClick={() => onAction({ id: `${s.id}-both`, label: `Both — answering: ${s.label}` } as Suggestion)}
                >
                  Both
                </button>
                <button
                  type="button"
                  className="rounded-full border border-[var(--so-border,#E5E5EA)] px-3.5 py-1.5 text-[13px] text-[var(--so-text-secondary,#8E8E93)] transition hover:bg-[var(--so-bg-secondary,#F2F2F7)] dark:border-[var(--so-border,#2C2C2E)] dark:hover:bg-[#2C2C2E]"
                  onClick={() => onAction({ id: `${s.id}-unsure`, label: `Not sure — answering: ${s.label}` } as Suggestion)}
                >
                  Not sure
                </button>
              </div>
            </div>
          );
        }
        
        // Type 2: Open-ended question ("Any dietary preferences?") → show as prompt, click focuses input
        if (openEnded) {
          return (
            <div
              key={s.id}
              className="flex items-start gap-2 rounded-xl border border-dashed border-[var(--so-border,#E5E5EA)] px-3.5 py-2.5 text-[14px] text-[var(--so-text-secondary,#8E8E93)] dark:border-[var(--so-border,#2C2C2E)] cursor-pointer hover:border-[var(--so-accent,#06B6D4)] hover:text-[var(--so-accent,#06B6D4)] transition"
              onClick={() => {
                // Focus the chat input and set placeholder text
                const input = document.querySelector<HTMLTextAreaElement>("[data-chat-input], textarea");
                if (input) {
                  input.focus();
                  input.placeholder = s.label.replace(/\?$/, "") + "...";
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-0.5">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <span>{s.label}</span>
            </div>
          );
        }
        
        // Type 3: Regular follow-up (clickable, sends as message)
        return (
          <button
            key={s.id}
            type="button"
            className="block w-full text-left rounded-xl border border-[var(--so-border,#E5E5EA)] px-3.5 py-2.5 text-[13px] text-[var(--so-text,#000)] transition hover:border-[var(--so-accent,#06B6D4)] hover:bg-[rgba(6,182,212,0.04)] dark:border-[var(--so-border,#2C2C2E)] dark:text-[var(--so-text,#fff)] dark:hover:border-[#22D3EE]"
            onClick={() => onAction(s)}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
