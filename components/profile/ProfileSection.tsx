"use client";

import { ReactNode, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export type ProfileSectionProps = {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  defaultOpen?: boolean;
  className?: string;
};

export default function ProfileSection({
  title,
  children,
  actions,
  isLoading = false,
  hasError = false,
  errorMessage,
  isEmpty = false,
  emptyMessage = "No data yet.",
  defaultOpen = true,
  className = "",
}: ProfileSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      className={`rounded-[12px] border border-border/70 bg-background/95 p-3 shadow-sm backdrop-blur-sm transition-colors dark:border-border/40 dark:bg-background/60 ${className}`}
    >
      <header className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left text-sm font-semibold text-foreground"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-controls={sectionId(title)}
        >
          {open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <span className="truncate">{title}</span>
        </button>
        {actions ? (
          <div
            className="flex flex-wrap items-center gap-x-2 gap-y-1.5 sm:justify-end"
            aria-label={`${title} actions`}
          >
            {actions}
          </div>
        ) : null}
      </header>
      <div id={sectionId(title)} className={open ? "mt-2.5" : "mt-2.5 hidden"}>
        {isLoading ? (
          <div className="space-y-2">
            <SkeletonLine />
            <SkeletonLine className="w-3/4" />
          </div>
        ) : hasError ? (
          <p className="text-sm text-destructive">
            {errorMessage || "Couldn’t load this section."}
          </p>
        ) : isEmpty ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

function sectionId(title: string) {
  return `profile-section-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-3 animate-pulse rounded bg-muted/70 dark:bg-muted/40 ${className}`}
      aria-hidden="true"
    />
  );
}
