"use client";

import * as React from "react";

type ThinkingEvent =
  | { state: "start"; label?: string; minSeconds?: number }
  | { state: "headers"; minSeconds?: number; provider?: string; model?: string }
  | { state: "stop" };

export default function ThinkingInline({
  className = "",
  showMin = true,
}: { className?: string; showMin?: boolean }) {
  const [active, setActive] = React.useState(false);
  const [label, setLabel] = React.useState("Analyzing…");
  const [elapsed, setElapsed] = React.useState(0);
  const [min, setMin] = React.useState<number>(() => {
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

  return (
    <div className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}>
      <span className="relative inline-flex">
        <span className="h-2.5 w-2.5 rounded-full bg-gray-400 opacity-70" />
        <span className="absolute h-2.5 w-2.5 rounded-full animate-ping bg-gray-400 opacity-40" />
      </span>
      <span className="font-medium">{label}</span>
      <span className="tabular-nums">• {mm}:{ss}</span>
      {showMin && <span className="opacity-70"> (min {min}s)</span>}
    </div>
  );
}

