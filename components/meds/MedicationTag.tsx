"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

export type MedicationTagProps = {
  label: ReactNode;
  onRemove?: () => void;
  disabled?: boolean;
};

export default function MedicationTag({ label, onRemove, disabled = false }: MedicationTagProps) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-border/70 bg-muted/60 px-3 text-[11px] font-medium text-foreground/90 dark:border-border/40 dark:bg-muted/30">
      <span className="max-w-[10rem] truncate" title={typeof label === "string" ? label : undefined}>
        {label}
      </span>
      {onRemove ? (
        <button
          type="button"
          className="ml-1 flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          onClick={onRemove}
          disabled={disabled}
          aria-label="Remove medication"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}
