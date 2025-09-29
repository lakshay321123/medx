"use client";

import { useMemo } from "react";
import WwwGlobeIcon from "@/components/icons/WwwGlobe";
import { useT } from "@/components/hooks/useI18n";
import { useModeController } from "@/hooks/useModeController";

const wellnessTitle = "Wellness Mode: ON";
const wellnessSubtitle =
  "Your health, made simple. Reports, tips, medication, diets, and fitness—explained in clear language.";
const clinicalTitle = "Clinical Mode: ON";
const clinicalSubtitle = "Evidence-ready, clinician-first.";
const therapyTitle = "Therapy Mode: ON";
const therapySubtitle =
  "Therapy guidance, made clear. Tools and support; not for emergencies.";
const aidocTitle = "AI Doc: ON";
const aidocSubtitle =
  "Your records, organized. Upload, store, and retrieve securely.";

const researchOnKey = "Research: On — web evidence";
const researchOffKey = "Research: Off — enable web evidence";

export default function ModeBanner() {
  const { state, toggleResearch, researchEnabled } = useModeController();
  const t = useT();

  const content = useMemo(() => {
    if (state.therapy) {
      return {
        title: therapyTitle,
        subtitle: therapySubtitle,
        researchAvailable: false,
      } as const;
    }

    switch (state.base) {
      case "doctor":
        return {
          title: clinicalTitle,
          subtitle: clinicalSubtitle,
          researchAvailable: true,
        } as const;
      case "aidoc":
        return {
          title: aidocTitle,
          subtitle: aidocSubtitle,
          researchAvailable: false,
        } as const;
      case "patient":
      default:
        return {
          title: wellnessTitle,
          subtitle: wellnessSubtitle,
          researchAvailable: true,
        } as const;
    }
  }, [state.base, state.therapy]);

  const researchActive = state.research && !state.therapy && state.base !== "aidoc";
  const showResearchToggle = content.researchAvailable;

  const researchLabel = t(researchActive ? researchOnKey : researchOffKey);

  const buttonClasses = [
    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 dark:focus:ring-offset-slate-900",
    researchActive
      ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
      : "border-slate-300 bg-white/70 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:bg-slate-800",
    researchEnabled ? "" : "opacity-60 cursor-not-allowed",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm transition dark:border-slate-700 dark:bg-slate-900/70">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
            {t(content.title)}
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {t(content.subtitle)}
          </p>
        </div>
        {showResearchToggle ? (
          <button
            type="button"
            aria-pressed={researchActive}
            aria-label={t("Toggle research mode")}
            onClick={() => {
              if (!researchEnabled) return;
              toggleResearch();
            }}
            disabled={!researchEnabled}
            className={buttonClasses}
          >
            <WwwGlobeIcon className="h-4 w-4" />
            <span>{researchLabel}</span>
          </button>
        ) : null}
      </div>
    </section>
  );
}
