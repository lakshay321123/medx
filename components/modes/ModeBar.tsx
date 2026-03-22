"use client";
import { useModeController } from "@/hooks/useModeController";
import { useT } from "@/components/hooks/useI18n";
import clsx from "clsx";

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

  return (
    <div className="mode-bar">
      <button
        className={clsx("mode-btn", wellnessActive && "mode-btn-active")}
        onClick={() => togglePatient()}
      >
        {t("ui.modes.wellness")}
      </button>
      <button
        className={clsx(
          "mode-btn",
          state.therapy && "mode-btn-active",
          (aidocOn || state.base !== "patient" || therapyBusy) && "opacity-60 cursor-not-allowed"
        )}
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
        className={clsx("mode-btn", state.research && "mode-btn-active", aidocOn && "opacity-60 cursor-not-allowed")}
        disabled={aidocOn}
        onClick={() => toggleResearch()}
      >
        {t("ui.modes.research")}
      </button>
      <button
        className={clsx("mode-btn", doctorActive && "mode-btn-active")}
        onClick={() => toggleDoctor()}
      >
        {t("ui.modes.clinical")}
      </button>

      <div className="mx-0.5 h-4 w-px" style={{ background: "var(--so-border)" }} />

      <button
        className={clsx("mode-btn", aidocOn && "mode-btn-active")}
        onClick={() => toggleAidoc()}
      >
        {t("ui.modes.ai_doc")}
      </button>
    </div>
  );
}
