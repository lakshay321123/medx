"use client";
import clsx from "clsx";
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

  const btn = (active: boolean, disabled?: boolean) =>
    clsx(
      "h-9 rounded-full border px-4 text-sm font-medium transition",
      "border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--hover)]",
      active && "bg-[var(--selected)] border-[var(--brand)]",
      disabled && "cursor-not-allowed opacity-60",
    );

  const aidocOn = state.base === "aidoc";
  const wellnessActive = state.base === "patient" && !state.therapy;
  const doctorActive = state.base === "doctor";

  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[var(--text)] backdrop-blur">
      <button
        className={btn(wellnessActive)}
        onClick={() => togglePatient()}
      >
        {t("ui.modes.wellness")}
      </button>
      <button
        className={btn(state.therapy, aidocOn || state.base !== "patient" || therapyBusy)}
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
        disabled={aidocOn}
        onClick={() => toggleResearch()}
      >
        {t("ui.modes.research")}
      </button>
      <button
        className={btn(doctorActive)}
        onClick={() => toggleDoctor()}
      >
        {t("ui.modes.clinical")}
      </button>

      <div className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10" />

      <button className={btn(aidocOn)} onClick={() => toggleAidoc()}>
        {t("ui.modes.ai_doc")}
      </button>
    </div>
  );
}
