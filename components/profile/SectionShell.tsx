"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export type SectionShellProps = {
  title: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  children: ReactNode;
  defaultOpen?: boolean;
  collapsible?: boolean;
  primaryDisabled?: boolean;
};

export function SectionShell({
  title,
  primaryLabel,
  onPrimary,
  children,
  defaultOpen = true,
  collapsible = true,
  primaryDisabled = false,
}: SectionShellProps) {
  const [open, setOpen] = useState(defaultOpen);
  const showBody = !collapsible || open;

  return (
    <section className="rounded-2xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          {collapsible ? (
            <button
              type="button"
              onClick={() => setOpen(prev => !prev)}
              className="flex items-center gap-2 text-left text-sm font-medium"
              aria-expanded={open}
              aria-controls={sectionId(title)}
            >
              {open ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              )}
              <span>{title}</span>
            </button>
          ) : (
            <h3 className="text-sm font-medium" id={sectionId(title)}>
              {title}
            </h3>
          )}
        </div>
        {onPrimary && primaryLabel ? (
          <button
            type="button"
            onClick={onPrimary}
            disabled={primaryDisabled}
            className="rounded-lg border px-3 py-1.5 text-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            data-testid={`${slugify(title)}-primary`}
          >
            {primaryLabel}
          </button>
        ) : null}
      </div>
      {showBody ? (
        <div id={sectionId(title)} className="p-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function sectionId(title: string) {
  return `profile-section-${slugify(title)}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .trim();
}
