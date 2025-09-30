"use client";

import type { PrefSection } from "./prefs.schema";
import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

export type PreferencesTabsProps = {
  sections: PrefSection[];
  activeId: string;
  onSelect: (id: string) => void;
  icons: Record<string, LucideIcon | undefined>;
  translate: (key: string) => string;
  variant: "desktop" | "mobile";
};

export default function PreferencesTabs({
  sections,
  activeId,
  onSelect,
  icons,
  translate,
  variant,
}: PreferencesTabsProps) {
  if (variant === "mobile") {
    return (
      <nav
        className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [-ms-overflow-style:none]"
        aria-label={translate("Preferences")}
      >
        {sections.map((section) => {
          const active = section.id === activeId;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSelect(section.id)}
              className={clsx(
                "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium",
                active
                  ? "border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
                  : "border-transparent bg-[var(--surface)]/60 text-[var(--muted)]",
              )}
            >
              {translate(section.titleKey)}
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="mt-1 space-y-1 overflow-auto pr-1" aria-label={translate("Preferences")}>
      {sections.map((section) => {
        const Icon = icons[section.id];
        const active = section.id === activeId;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelect(section.id)}
            className={clsx(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px]",
              active
                ? "bg-[var(--surface)] ring-1 ring-[var(--border)] text-[var(--text)]"
                : "text-[var(--muted)] hover:bg-[var(--surface)]/70",
            )}
          >
            {Icon ? <Icon size={14} className="opacity-70" /> : null}
            <span>{translate(section.titleKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
