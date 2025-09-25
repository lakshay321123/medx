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
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-3 py-1 text-sm text-foreground">
      <span className="max-w-[10rem] truncate" title={typeof label === "string" ? label : undefined}>
        {label}
      </span>
      {onRemove ? (
        <button
          type="button"
          className="ml-1 flex h-6 w-6 items-center justify-center rounded-full transition hover:bg-muted"
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
