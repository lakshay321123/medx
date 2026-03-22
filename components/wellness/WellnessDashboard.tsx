"use client";

import { Pill, Flame } from "lucide-react";

export default function WellnessDashboard() {
  return (
    <div className="mx-auto w-full max-w-[860px] px-4 pb-2 pt-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-2 rounded-2xl border p-4" style={{ borderColor: "var(--so-border,#E5E5EA)", background: "var(--so-card,#fff)" }}>
          <div className="relative flex h-[68px] w-[68px] items-center justify-center rounded-full" style={{ background: "conic-gradient(#34D399 0% 78%, var(--so-border,#E5E5EA) 78% 100%)" }}>
            <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full text-[22px] font-bold" style={{ background: "var(--so-card,#fff)", color: "var(--so-text,#000)" }}>78</div>
          </div>
          <div className="text-[13px] font-semibold" style={{ color: "var(--so-text,#000)" }}>Health score</div>
          <div className="text-[12px] font-semibold" style={{ color: "#34D399" }}>+3 this week</div>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl border p-4" style={{ borderColor: "var(--so-border,#E5E5EA)", background: "var(--so-card,#fff)" }}>
          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--so-text-secondary,#8E8E93)" }}><Pill size={14} strokeWidth={1.5} />Today&apos;s meds</div>
          <div className="text-[26px] font-bold leading-none" style={{ color: "var(--so-text,#000)" }}>2<span className="text-[14px] font-normal" style={{ color: "var(--so-text-secondary,#8E8E93)" }}> of 3</span></div>
          <div className="h-[5px] w-full overflow-hidden rounded-full" style={{ background: "var(--so-border,#E5E5EA)" }}><div className="h-full rounded-full" style={{ width: "66%", background: "var(--so-accent,#06B6D4)" }} /></div>
          <div className="text-[12px] font-medium" style={{ color: "#FF9500" }}>Metformin due 9pm</div>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl border p-4" style={{ borderColor: "var(--so-border,#E5E5EA)", background: "var(--so-card,#fff)" }}>
          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--so-text-secondary,#8E8E93)" }}><Flame size={14} strokeWidth={1.5} />Streak</div>
          <div className="text-[26px] font-bold leading-none" style={{ color: "var(--so-text,#000)" }}>12<span className="text-[14px] font-normal" style={{ color: "var(--so-text-secondary,#8E8E93)" }}> days</span></div>
          <div className="flex gap-[3px] pt-1">{Array.from({ length: 7 }).map((_, i) => (<div key={i} className="h-[14px] w-[14px] rounded-[3px]" style={{ background: "var(--so-accent,#06B6D4)" }} />))}</div>
        </div>
      </div>
    </div>
  );
}
