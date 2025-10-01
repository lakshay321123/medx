"use client";

import React from "react";
import { useReader } from "@/components/hooks/useReader";

type ListenButtonProps = {
  getText: () => string;
  lang?: string;
  className?: string;
  stopPropagation?: boolean;
  label?: string;
  stopLabel?: string;
};

export function ListenButton({
  getText,
  lang,
  className = "",
  stopPropagation = false,
  label = "Listen",
  stopLabel = "Stop",
}: ListenButtonProps) {
  const { canUse, status, read, stop } = useReader();

  if (!canUse) return null;

  const isActive = status === "speaking" || status === "paused" || status === "loading";

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
    event.preventDefault();
    if (isActive) {
      stop();
      return;
    }
    const text = getText();
    if (!text || !text.trim()) return;
    read({ text, lang });
  };

  const displayLabel = isActive ? stopLabel : label;

  return (
    <button
      type="button"
      aria-label={displayLabel}
      aria-pressed={isActive}
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 rounded-full border border-transparent px-2 py-1 text-xs text-slate-600 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-1 dark:text-slate-300 dark:hover:text-white ${className}`.trim()}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="opacity-80">
        <path d="M3 10v4h4l5 5V5L7 10H3z" fill="currentColor" />
        <path d="M16 7.5a6.5 6.5 0 0 1 0 9M18.5 5a9 9 0 0 1 0 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="font-medium">{displayLabel}</span>
    </button>
  );
}
