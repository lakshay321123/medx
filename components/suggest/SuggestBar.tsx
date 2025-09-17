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
    <div className={`mb-3 ${className}`}>
      <div className="mb-2 text-sm opacity-70">{title}</div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s, i) => (
          <button
            key={`${s}-${i}`}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            title={s}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
