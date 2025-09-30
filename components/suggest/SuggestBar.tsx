"use client";

import { useMemo } from "react";

import { useT } from "@/components/hooks/useI18n";
import { SUGGESTION_LABELS_EN, type SuggestionKey } from "@/data/suggestions";

const TITLE_KEY_BY_VALUE: Record<string, string> = {
  "Try asking:": "common.ui.try_these",
  "Popular questions": "common.ui.popular_questions",
  Suggestions: "common.ui.suggestions",
};

const TITLE_FALLBACK: Record<string, string> = {
  "common.ui.try_these": "Try these",
  "common.ui.popular_questions": "Popular questions",
  "common.ui.suggestions": "Suggestions",
};

type SuggestBarProps = {
  suggestions: string[];
  onPick: (text: string) => void;
  title?: string;
  className?: string;
};

export default function SuggestBar({ suggestions, onPick, title, className = "" }: SuggestBarProps) {
  const t = useT();

  const header = useMemo(() => {
    const key = title ? TITLE_KEY_BY_VALUE[title] ?? title : "common.ui.try_these";
    const translated = t(key);
    const fallback = TITLE_FALLBACK[key] ?? title ?? "Try these";
    return translated === key ? fallback : translated;
  }, [t, title]);

  if (!suggestions?.length) return null;

  return (
    <div className={`mt-2 ${className}`}>
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {header}
      </div>
      <div className="flex flex-wrap gap-1 pb-1">
        {suggestions.map((raw, index) => {
          const key = raw as SuggestionKey;
          const fallback = SUGGESTION_LABELS_EN[key] ?? raw;
          const translated = t(raw);
          const label = translated === raw ? fallback : translated;
          return (
            <button
              key={`${raw}-${index}`}
              type="button"
              onClick={() => onPick(label)}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700/80"
              title={label}
              aria-label={label}
              data-suggestion-button="true"
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
