"use client";

import type { ReactNode } from "react";

type RowProps = {
  label: string;
  value: ReactNode;
  muted?: boolean;
  bold?: boolean;
};

export default function Row({ label, value, muted = false, bold = false }: RowProps) {
  const valueClasses = ["text-[14px] leading-6", bold ? "font-semibold" : "", muted ? "text-slate-400 dark:text-slate-500" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      <span className={valueClasses}>{value}</span>
    </div>
  );
}
