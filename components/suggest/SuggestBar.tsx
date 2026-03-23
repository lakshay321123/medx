"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
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

  // Show max 2 rows of 2 cards on desktop, scrollable on mobile
  const visible = suggestions.slice(0, 8);

  return (
    <div className={`${className}`}>
      <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-[var(--so-text-secondary,#8E8E93)]">
        <Sparkles className="h-3 w-3" />
        <span>{header}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 max-w-xl mx-auto">
        {visible.map((raw, index) => {
          const key = raw as SuggestionKey;
          const fallback = SUGGESTION_LABELS_EN[key] ?? raw;
          const translated = t(raw);
          const label = translated === raw ? fallback : translated;
          return (
            <button
              key={`${raw}-${index}`}
              type="button"
              onClick={() => onPick(label)}
              className="group text-left rounded-2xl border border-[var(--so-border,#E5E5EA)] dark:border-[#2C2C2E] px-3.5 py-2.5 text-[12px] leading-snug transition-all hover:border-[var(--so-accent,#06B6D4)] hover:bg-[rgba(6,182,212,0.02)] text-[var(--so-text,#000)] dark:text-[var(--so-text,#fff)]"
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
