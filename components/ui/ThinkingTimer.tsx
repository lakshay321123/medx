"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  /** e.g., "Thinking", "Analyzing", "Verifying" */
  label?: string;
  /** When the action started (ms since epoch). If absent, starts now. */
  startedAt?: number;
  /** Optional: auto-start when mounted if true and no startedAt is provided */
  autoStart?: boolean;
};

export default function ThinkingTimer({ label = "Thinking", startedAt, autoStart = true }: Props) {
  const [now, setNow] = useState<number>(Date.now());
  const start = useMemo(() => startedAt ?? (autoStart ? Date.now() : undefined), [startedAt, autoStart]);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!start) return;
    intervalRef.current = window.setInterval(() => setNow(Date.now()), 100); // 0.1s updates feel responsive
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [start]);

  if (!start) return null;
  const elapsed = Math.max(0, now - start); // ms
  const secs = Math.floor(elapsed / 1000);
  const ms2 = Math.floor((elapsed % 1000) / 100); // tenths for subtle movement (optional)
  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700 dark:bg-[var(--medx-panel)] dark:text-neutral-200">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
      </span>
      <span className="font-medium">{label}</span>
      <span aria-live="polite" className="tabular-nums font-mono text-neutral-600 dark:text-neutral-300">
        {mm}:{ss}.{ms2}
      </span>
    </div>
  );
}

