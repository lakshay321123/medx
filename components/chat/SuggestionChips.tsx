import { isAction, Suggestion } from "@/lib/chat/suggestions";

type Props = { suggestions: Suggestion[]; onAction: (s: Suggestion) => void };

export default function SuggestionChips({ suggestions, onAction }: Props) {
  if (!suggestions?.length) return null;

  // Optional hard guard to strip accidental actionIds
  const safe = suggestions.map((s) => (s.actionId ? s : { ...s, actionId: undefined as never }));

  return (
    <div className="mt-1.5 flex flex-wrap gap-2">
      {safe.map((s) =>
        isAction(s) ? (
          <button
            key={s.id}
            type="button"
            className="px-3 py-1 rounded-2xl text-sm shadow-sm hover:shadow
                       border border-neutral-300 dark:border-neutral-700
                       hover:bg-neutral-50 dark:hover:bg-neutral-800"
            onClick={() => onAction(s)}
            aria-label={s.label}
          >
            {s.label}
          </button>
        ) : (
          <span
            key={s.id}
            className="px-3 py-1 rounded-2xl text-sm border border-dashed
                       text-neutral-500 dark:text-neutral-400
                       border-neutral-300 dark:border-neutral-700
                       cursor-default select-text"
            aria-disabled="true"
          >
            {s.label}
          </span>
        )
      )}
    </div>
  );
}
