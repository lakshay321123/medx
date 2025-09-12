"use client";

import React from "react";
type ThinkingEvent =
  | { state: "start"; label?: string; minSeconds?: number }
  | { state: "headers"; minSeconds?: number; provider?: string; model?: string }
  | { state: "stop" };

export default function ThinkingIndicator() {
  const [active, setActive] = React.useState(false);
  const [label, setLabel] = React.useState("Analyzing…");
  const [elapsed, setElapsed] = React.useState(0);
  const [min, setMin] = React.useState<number>(() => {
    // fallbacks: response header (preferred) -> NEXT_PUBLIC_ -> default 10
    const env = Number(process.env.NEXT_PUBLIC_MIN_OUTPUT_DELAY_SECONDS || "");
    return Number.isFinite(env) ? env : 10;
  });
  const startedAt = React.useRef<number | null>(null);
  const timer = React.useRef<number | null>(null);

  React.useEffect(() => {
    function onEvt(e: Event) {
      const ce = e as CustomEvent<ThinkingEvent>;
      const d = ce.detail;
      if (!d) return;
      if (d.state === "start") {
        setLabel(d.label || "Analyzing…");
        if (Number.isFinite(d.minSeconds as number)) setMin((d.minSeconds as number)!);
        startedAt.current = Date.now();
        setElapsed(0);
        setActive(true);
        if (timer.current) window.clearInterval(timer.current);
        timer.current = window.setInterval(() => {
          if (!startedAt.current) return;
          setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
        }, 250);
      } else if (d.state === "headers") {
        if (Number.isFinite(d.minSeconds as number)) setMin((d.minSeconds as number)!);
      } else if (d.state === "stop") {
        if (timer.current) window.clearInterval(timer.current);
        timer.current = null;
        startedAt.current = null;
        setActive(false);
        setElapsed(0);
      }
    }
    window.addEventListener("medx-thinking", onEvt as any);
    return () => {
      window.removeEventListener("medx-thinking", onEvt as any);
      if (timer.current) window.clearInterval(timer.current);
    };
  }, []);

  if (!active) return null;

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const target = Math.max(0, min);
  const remaining = Math.max(0, target - elapsed);
  const rr = String(remaining).padStart(2, "0");

  return (
    <div className="fixed inset-x-0 top-0 z-[1000] flex justify-center">
      <div className="mt-2 px-3 py-2 rounded-xl bg-black/80 text-white shadow-lg backdrop-blur-md border border-white/10 flex items-center gap-3">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white"></span>
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-sm opacity-80">elapsed {mm}:{ss}</span>
        <span className="text-sm opacity-60">| min {target}s</span>
        <span className="text-sm opacity-60">| remaining {rr}s</span>
      </div>
    </div>
  );
}

