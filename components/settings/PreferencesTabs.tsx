"use client";

import type { PrefSection } from "./prefs.schema";
import cn from "clsx";

export type PreferencesTabsProps = {
  sections: PrefSection[];
  activeId: string;
  onSelect: (id: string) => void;
  className?: string;
  getLabel: (section: PrefSection) => string;
  ariaLabel: string;
};

export default function PreferencesTabs({
  sections,
  activeId,
  onSelect,
  className,
  getLabel,
  ariaLabel,
}: PreferencesTabsProps) {
  const toDomId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex gap-2 overflow-x-auto no-scrollbar",
        className
      )}
    >
      {sections.map((section) => {
        const active = section.id === activeId;
        const domId = toDomId(section.id);
        return (
          <button
            key={section.id}
            role="tab"
            id={`tab-${domId}`}
            aria-selected={active}
            aria-controls={`panel-${domId}`}
            onClick={() => onSelect(section.id)}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition",
              active
                ? "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text)]"
                : "bg-[var(--surface)] border-transparent text-[var(--muted)]"
            )}
            type="button"
          >
            {getLabel(section)}
          </button>
        );
      })}
    </div>
  );
}
