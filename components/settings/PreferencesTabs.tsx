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
  const panelId = "prefs-panel";

  if (variant === "mobile") {
    return (
      <div
        role="tablist"
        aria-label={translate("Preferences")}
        className="flex gap-2 overflow-x-auto border-b border-[var(--border)] px-3 pt-2 pb-1 no-scrollbar"
      >
        {sections.map((section) => {
          const active = section.id === activeId;
          const tabId = `pref-tab-${section.id}`;
          return (
            <button
              key={section.id}
              id={tabId}
              role="tab"
              type="button"
              tabIndex={active ? 0 : -1}
              aria-selected={active}
              aria-controls={panelId}
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
      </div>
    );
  }

  return (
    <nav
      role="tablist"
      aria-label={translate("Preferences")}
      className="mt-1 space-y-1 overflow-auto pr-1"
    >
      {sections.map((section) => {
        const Icon = icons[section.id];
        const active = section.id === activeId;
        const tabId = `pref-tab-${section.id}`;
        return (
          <button
            key={section.id}
            id={tabId}
            role="tab"
            type="button"
            tabIndex={active ? 0 : -1}
            aria-selected={active}
            aria-controls={panelId}
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
