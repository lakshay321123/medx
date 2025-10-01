"use client";

import { useT } from "@/components/hooks/useI18n";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export type MedicationTagProps = {
  label: ReactNode;
  onRemove?: () => void;
  disabled?: boolean;
};

export default function MedicationTag({ label, onRemove, disabled = false }: MedicationTagProps) {
  const t = useT();
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-3 py-1 text-sm text-foreground">
      <span className="max-w-[10rem] truncate" title={typeof label === "string" ? label : undefined}>
        {label}
      </span>
      {onRemove ? (
        <button
          type="button"
          className="ml-1 flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-muted"
          onClick={onRemove}
          disabled={disabled}
          aria-label={t("Remove medication")}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}
