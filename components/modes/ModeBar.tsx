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

  const btn = (active: boolean, disabled?: boolean) =>
    [
      "h-9 rounded-full border px-4 text-sm font-medium transition",
      active
        ? "bg-blue-600 border-blue-600 text-white shadow-sm"
        : "bg-white/70 text-slate-900 border-slate-200 hover:bg-slate-100 dark:bg-slate-800/70 dark:text-white dark:border-slate-700 dark:hover:bg-slate-800",
      disabled ? "opacity-60 cursor-not-allowed" : "",
    ].filter(Boolean).join(" ");

  const aidocOn = state.base === "aidoc";
  const wellnessActive = state.base === "patient" && !state.therapy;
  const doctorActive = state.base === "doctor";

  return (
    <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-black/10 bg-white/60 px-2 py-1 backdrop-blur dark:border-white/10 dark:bg-slate-900/40">
      <button
        className={btn(wellnessActive)}
        onClick={() => togglePatient()}
      >
        {t("Wellness")}
      </button>
      <button
        className={btn(state.therapy, aidocOn || state.base !== "patient" || therapyBusy)}
        disabled={aidocOn || state.base !== "patient" || therapyBusy}
        onClick={() => toggleTherapy()}
        aria-busy={therapyBusy}
      >
        <span>{t("Therapy")}</span>
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
        {t("Research")}
      </button>
      <button
        className={btn(doctorActive)}
        onClick={() => toggleDoctor()}
      >
        {t("Clinical")}
      </button>

      <div className="mx-1 h-5 w-px bg-black/10 dark:bg-white/10" />

      <button className={btn(aidocOn)} onClick={() => toggleAidoc()}>
        {t("AI Doc")}
      </button>
    </div>
  );
}
