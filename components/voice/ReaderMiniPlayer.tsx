"use client";

import React from "react";
import { useReader } from "@/components/hooks/useReader";

const formatReason = (reason?: string) => {
  if (!reason) return "";
  if (reason === "match-prefix") return "matched locale";
  if (reason === "match-base") return "matched language";
  if (reason === "no-voices") return "no voices";
  return reason;
};

export function ReaderMiniPlayer() {
  const { status, pause, resume, stop, speed, setSpeed, reason } = useReader();
  const visible = status !== "idle";

  if (!visible) return null;

  const readableReason = formatReason(reason);

  return (
    <div
      role="region"
      aria-label="Reader controls"
      className="fixed bottom-3 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-xs shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/90"
    >
      <span className="font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">Reader</span>
      {status === "speaking" ? (
        <button type="button" onClick={pause} className="underline">
          Pause
        </button>
      ) : status === "paused" ? (
        <button type="button" onClick={resume} className="underline">
          Resume
        </button>
      ) : (
        <span className="text-slate-400">Loading…</span>
      )}
      <label className="flex items-center gap-2">
        <span className="uppercase tracking-wide text-[10px] text-slate-500 dark:text-slate-300">Speed</span>
        <input
          type="range"
          min={0.6}
          max={1.8}
          step={0.1}
          value={speed}
          onChange={event => {
            const next = parseFloat(event.target.value);
            if (!Number.isNaN(next)) {
              setSpeed(next);
            }
          }}
          className="h-2 w-24 accent-blue-600"
        />
      </label>
      <button type="button" onClick={stop} className="underline">
        Stop
      </button>
      {readableReason ? (
        <span className="text-[10px] text-slate-400 dark:text-slate-500">({readableReason})</span>
      ) : null}
    </div>
  );
}
