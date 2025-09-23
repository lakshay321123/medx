import { isAction, Suggestion } from "@/lib/chat/suggestions";

type Props = { suggestions: Suggestion[]; onAction: (s: Suggestion) => void };

export default function SuggestionChips({ suggestions, onAction }: Props) {
  if (!suggestions?.length) return null;

  // Optional hard guard to strip accidental actionIds
  const safe = suggestions.map((s) => (s.actionId ? s : { ...s, actionId: undefined as never }));

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {safe.map((s) =>
        isAction(s) ? (
          <button
            key={s.id}
            type="button"
            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700/80"
            onClick={() => onAction(s)}
            aria-label={s.label}
          >
            {s.label}
          </button>
        ) : (
          <span
            key={s.id}
            className="rounded-full border border-dashed border-slate-200 px-2 py-0.5 text-xs text-slate-500 cursor-default select-text dark:border-slate-700 dark:text-slate-300"
            aria-disabled="true"
          >
            {s.label}
          </span>
        ),
      )}
    </div>
  );
}
