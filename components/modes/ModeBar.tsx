"use client";
import { useRef, useEffect, useState } from "react";
import { useModeController } from "@/hooks/useModeController";
import { useT } from "@/components/hooks/useI18n";

type BaseMode = "wellness" | "therapy" | "clinical" | "aidoc";

export default function ModeBar() {
  const {
    state, therapyBusy,
    togglePatient, toggleDoctor, toggleAidoc, toggleTherapy, toggleResearch,
  } = useModeController();
  const t = useT();

  const aidocOn = state.base === "aidoc";
  const therapyOn = state.therapy;
  const researchOn = state.research;

  // Active base mode (Research is a modifier, not a base)
  const activeBase: BaseMode = aidocOn ? "aidoc"
    : therapyOn ? "therapy"
    : state.base === "doctor" ? "clinical"
    : "wellness";

  const baseModes: { key: BaseMode; label: string; action: () => void; disabled?: boolean }[] = [
    { key: "wellness", label: t("ui.modes.wellness"), action: togglePatient },
    { key: "therapy", label: t("ui.modes.therapy"), action: toggleTherapy, disabled: aidocOn || therapyBusy },
    { key: "clinical", label: t("ui.modes.clinical"), action: toggleDoctor },
    { key: "aidoc", label: t("ui.modes.aidoc"), action: toggleAidoc },
  ];

  // Research can combine with Wellness or Clinical (not Therapy or AI Doc)
  const canResearch = activeBase === "wellness" || activeBase === "clinical";

  // Sliding pill
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const btn = buttonsRef.current.get(activeBase);
    const container = containerRef.current;
    if (btn && container) {
      const cRect = container.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      setPillStyle({ left: bRect.left - cRect.left, width: bRect.width });
    }
  }, [activeBase]);

  return (
    <div className="flex items-center gap-2">
      {/* Base mode pills */}
      <div
        ref={containerRef}
        className="relative inline-flex items-center rounded-full px-0.5 py-0.5"
        style={{ background: "var(--so-bg-secondary, #F2F2F7)" }}
      >
        {/* Animated sliding pill */}
        <div
          className="absolute top-0.5 bottom-0.5 rounded-full transition-all duration-300 ease-out"
          style={{
            left: pillStyle.left,
            width: pillStyle.width,
            background: "var(--so-accent, #06B6D4)",
            boxShadow: "0 1px 4px rgba(6,182,212,0.25)",
          }}
        />

        {baseModes.map((m) => {
          const isActive = activeBase === m.key;
          return (
            <button
              key={m.key}
              ref={(el) => { if (el) buttonsRef.current.set(m.key, el); }}
              type="button"
              disabled={m.disabled}
              onClick={m.action}
              className={[
                "relative z-10 rounded-full px-3 py-1 text-[11px] font-medium transition-colors duration-200",
                isActive ? "text-white" : "text-[var(--so-text-secondary,#8E8E93)] hover:text-[var(--so-text,#000)] dark:hover:text-white",
                m.disabled ? "opacity-30 cursor-not-allowed" : "",
              ].join(" ")}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Research toggle — separate, combines with active base */}
      {canResearch && (
        <button
          type="button"
          onClick={toggleResearch}
          className={[
            "rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all duration-200",
            researchOn
              ? "bg-[var(--so-accent,#06B6D4)] text-white border-[var(--so-accent,#06B6D4)] shadow-sm"
              : "bg-transparent text-[var(--so-text-secondary,#8E8E93)] border-[var(--so-border,#E5E5EA)] dark:border-[#3A3A3C] hover:border-[var(--so-accent,#06B6D4)] hover:text-[var(--so-accent,#06B6D4)]",
          ].join(" ")}
        >
          {t("ui.modes.research")}
          {researchOn && <span className="ml-1 text-[9px] opacity-80">+</span>}
        </button>
      )}
    </div>
  );
}
