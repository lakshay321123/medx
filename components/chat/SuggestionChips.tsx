import { useMemo } from "react";

import { useT } from "@/components/hooks/useI18n";
import { SUGGESTION_LABELS_EN } from "@/data/suggestions";
import { isAction, Suggestion } from "@/lib/chat/suggestions";

type Props = { suggestions: Suggestion[]; onAction: (s: Suggestion) => void };

export default function SuggestionChips({ suggestions, onAction }: Props) {
  if (!suggestions?.length) return null;

  // Optional hard guard to strip accidental actionIds
  const safe = suggestions.map((s) => (s.actionId ? s : { ...s, actionId: undefined as never }));
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
    <div className="mt-3 flex flex-wrap gap-1.5">
      {translated.map((s) =>
        isAction(s) ? (
          <button
            key={s.id}
            type="button"
            className="rounded-full px-3 py-1 text-xs font-medium transition" style={{ background: "var(--so-bg-secondary, #F2F2F7)", color: "var(--so-text, #000)" }}
            onClick={() => onAction(s)}
            aria-label={s.label}
          >
            {s.label}
          </button>
        ) : (
          <span
            key={s.id}
            className="rounded-full px-3 py-1 text-xs cursor-default select-text" style={{ background: "var(--so-bg-secondary, #F2F2F7)", color: "var(--so-text-secondary, #8E8E93)" }}
            aria-disabled="true"
          >
            {s.label}
          </span>
        ),
      )}
    </div>
  );
}
