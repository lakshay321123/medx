import React from "react";
import { useStopwatch } from "@/hooks/useStopwatch";

export function AnalyzingInline({ active }: { active: boolean }) {
  const { mm, ss } = useStopwatch(active);
  if (!active) return null;
  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs text-slate-600 border-slate-200 bg-white/60 dark:border-slate-700 dark:bg-slate-900/40">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      <span className="font-medium">Analyzing</span>
      <span className="tabular-nums">{mm}:{ss}</span>
    </span>
  );
}
