"use client";
import { useModeController } from "@/hooks/useModeController";
import { useT } from "@/components/hooks/useI18n";

export default function ModeBar() {
  const {
    state,
    therapyBusy,
    togglePatient,
    toggleDoctor,
    toggleAidoc,
    toggleTherapy,
    toggleResearch,
  } = useModeController();
  const t = useT();

  const aidocOn = state.base === "aidoc";
  const wellnessActive = state.base === "patient" && !state.therapy;
  const doctorActive = state.base === "doctor";

  const btn = (active: boolean, disabled?: boolean) =>
    [
      "h-9 rounded-full px-4 text-[13px] font-medium transition-all duration-200",
      active
        ? "text-white"
        : "text-black dark:text-white",
      disabled ? "opacity-40 cursor-not-allowed" : "",
    ].filter(Boolean).join(" ");

  const activeStyle = { background: "var(--so-accent, #06B6D4)" };
  const inactiveStyle = {};

  return (
    <div
      className="inline-flex flex-wrap items-center gap-1 rounded-full px-1.5 py-1"
      style={{ background: "var(--so-bg-secondary, #F2F2F7)" }}
    >
      <button
        className={btn(wellnessActive)}
        style={wellnessActive ? activeStyle : inactiveStyle}
        onClick={() => togglePatient()}
      >
        {t("ui.modes.wellness")}
      </button>
      <button
        className={btn(state.therapy, aidocOn || state.base !== "patient" || therapyBusy)}
        style={state.therapy ? activeStyle : inactiveStyle}
        disabled={aidocOn || state.base !== "patient" || therapyBusy}
        onClick={() => toggleTherapy()}
        aria-busy={therapyBusy}
      >
        <span>{t("ui.modes.therapy")}</span>
        {therapyBusy && !state.therapy ? (
          <span className="ml-2 inline-flex h-3 w-3 items-center" aria-hidden="true">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </span>
        ) : null}
      </button>
      <button
        className={btn(state.research, aidocOn)}
        style={state.research ? activeStyle : inactiveStyle}
        disabled={aidocOn}
        onClick={() => toggleResearch()}
      >
        {t("ui.modes.research")}
      </button>
      <button
        className={btn(doctorActive)}
        style={doctorActive ? activeStyle : inactiveStyle}
        onClick={() => toggleDoctor()}
      >
        {t("ui.modes.clinical")}
      </button>

      <div className="mx-1 h-5 w-px" style={{ background: "var(--so-border, #E5E5EA)" }} />

      <button
        className={btn(aidocOn)}
        style={aidocOn ? activeStyle : inactiveStyle}
        onClick={() => toggleAidoc()}
      >
        {t("ui.modes.ai_doc")}
      </button>
    </div>
  );
}
