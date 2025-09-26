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
    <section className={`rounded-xl border bg-background p-4 shadow-sm ${className}`}>
      <header className="flex items-start justify-between gap-3">
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left font-semibold"
          onClick={() => setOpen(v => !v)}
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
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      <div id={sectionId(title)} className={open ? "mt-3" : "mt-3 hidden"}>
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
