"use client";
import { useRef, useEffect, useState } from "react";
import { useModeController } from "@/hooks/useModeController";
import { useT } from "@/components/hooks/useI18n";

type ModeKey = "wellness" | "therapy" | "research" | "clinical" | "aidoc";

export default function ModeBar() {
  const {
    state, therapyBusy,
    togglePatient, toggleDoctor, toggleAidoc, toggleTherapy, toggleResearch,
  } = useModeController();
  const t = useT();

  const aidocOn = state.base === "aidoc";
  const activeKey: ModeKey = aidocOn ? "aidoc"
    : state.therapy ? "therapy"
    : state.research ? "research"
    : state.base === "doctor" ? "clinical"
    : "wellness";

  const modes: { key: ModeKey; label: string; action: () => void; disabled?: boolean }[] = [
    { key: "wellness", label: t("ui.modes.wellness"), action: togglePatient },
    { key: "therapy", label: t("ui.modes.therapy"), action: toggleTherapy, disabled: aidocOn || state.base !== "patient" || therapyBusy },
    { key: "research", label: t("ui.modes.research"), action: toggleResearch, disabled: aidocOn },
    { key: "clinical", label: t("ui.modes.clinical"), action: toggleDoctor },
    { key: "aidoc", label: t("ui.modes.aidoc"), action: toggleAidoc },
  ];

  // Sliding pill indicator
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const btn = buttonsRef.current.get(activeKey);
    const container = containerRef.current;
    if (btn && container) {
      const cRect = container.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      setPillStyle({
        left: bRect.left - cRect.left,
        width: bRect.width,
      });
    }
  }, [activeKey]);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex items-center gap-0.5 rounded-full px-1 py-0.5"
      style={{ background: "var(--so-bg-secondary, #F2F2F7)" }}
    >
      {/* Animated sliding pill */}
      <div
        className="absolute top-0.5 bottom-0.5 rounded-full transition-all duration-300 ease-out"
        style={{
          left: pillStyle.left,
          width: pillStyle.width,
          background: "var(--so-accent, #06B6D4)",
          boxShadow: "0 1px 3px rgba(6,182,212,0.3)",
        }}
      />

      {modes.map((m) => {
        const isActive = activeKey === m.key;
        return (
          <button
            key={m.key}
            ref={(el) => { if (el) buttonsRef.current.set(m.key, el); }}
            type="button"
            disabled={m.disabled}
            onClick={m.action}
            className={[
              "relative z-10 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors duration-200",
              isActive ? "text-white" : "text-[var(--so-text-secondary,#8E8E93)] hover:text-[var(--so-text,#000)] dark:hover:text-white",
              m.disabled ? "opacity-30 cursor-not-allowed" : "",
            ].join(" ")}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
