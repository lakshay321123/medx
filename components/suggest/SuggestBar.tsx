"use client";
import React from "react";

export default function SuggestBar({
  suggestions,
  onPick,
  title = "Try asking:",
  className = "",
}: {
  suggestions: string[];
  onPick: (text: string) => void;
  title?: string;
  className?: string;
}) {
  if (!suggestions?.length) return null;
  return (
    <div className={`mt-2 ${className}`}>
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </div>
      <div className="flex flex-wrap gap-1 pb-1">
        {suggestions.map((s, i) => (
          <button
            key={`${s}-${i}`}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700/80"
            title={s}
            data-suggestion-button="true"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
