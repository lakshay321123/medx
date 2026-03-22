"use client";
import { FORMATS } from "@/lib/formats/registry";
import type { FormatId, Mode } from "@/lib/formats/types";

type Props = {
  mode: Mode;
  activeFormat: FormatId | undefined;
  onSelect: (id: FormatId | undefined) => void;
};

const ICONS: Record<string, string> = {
  essay: "\u270D",
  bullet_summary: "\u2022",
  faq: "?",
  soap_note: "\uD83E\uDE7A",
  care_plan: "\uD83D\uDCCB",
  table_compare: "\u2630",
  step_by_step: "1.",
  patient_leaflet: "\uD83D\uDCC4",
};

export default function FormatSelector({ mode, activeFormat, onSelect }: Props) {
  const available = FORMATS.filter(f => f.allowedModes.includes(mode));
  if (!available.length) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-1 px-1">
      <button
        type="button"
        onClick={() => onSelect(undefined)}
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
          !activeFormat
            ? "bg-[var(--so-accent,#06B6D4)] text-white"
            : "border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] text-[var(--so-text-secondary,#8E8E93)]"
        }`}
      >
        Auto
      </button>
      {available.map(f => (
        <button
          key={f.id}
          type="button"
          onClick={() => onSelect(activeFormat === f.id ? undefined : f.id)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition whitespace-nowrap ${
            activeFormat === f.id
              ? "bg-[var(--so-accent,#06B6D4)] text-white"
              : "border border-[var(--so-border,#E5E5EA)] dark:border-[var(--so-border,#2C2C2E)] text-[var(--so-text-secondary,#8E8E93)] hover:border-[var(--so-accent,#06B6D4)]"
          }`}
        >
          {ICONS[f.id] ? `${ICONS[f.id]} ` : ""}{f.label.en}
        </button>
      ))}
    </div>
  );
}
