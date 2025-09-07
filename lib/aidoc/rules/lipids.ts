import { latestLab, isStale, onMeds } from "./utils";

export function lipidsRules({ labs, meds, mem }:{ labs:any[]; meds:any[]; mem:any }) {
  const steps: string[] = [];
  const nudges: string[] = [];
  const fired: string[] = [];
  const softAlerts: any[] = [];

  const ldl = latestLab(labs, "LDL") || latestLab(labs, "LDL-C");
  const stale = !ldl || isStale(ldl, 90);
  if (stale) {
    const when = (mem?.prefs||[]).find((p:any)=>p.key==="pref_test_time")?.value || "morning";
    steps.push(`Repeat fasting lipid panel (LDL) — last result is stale/missing. Prefer ${when} draw.`);
    nudges.push("Book lipid panel within 14 days.");
    fired.push("lipids.repeat_panel");
  } else if (ldl?.value != null) {
    const val = Number(ldl.value);
    if (Number.isFinite(val)) {
      if (val >= 190) {
        steps.push("High LDL (≥190): clinician discussion about high-intensity statin is warranted.");
        fired.push("lipids.high_ldl");
      } else if (val >= 130) {
        steps.push("Moderate LDL (130–189): intensify lifestyle; consider moderate-intensity statin as per risk.");
        fired.push("lipids.moderate_ldl");
      } else {
        steps.push("LDL controlled—maintain lifestyle and routine follow-up.");
        fired.push("lipids.controlled");
      }
    }
  }

  const onStatin = onMeds(meds, "statin") || onMeds(meds, "atorvastatin") || onMeds(meds, "rosuvastatin");
  if (!onStatin && !stale) {
    if ((ldl?.value ?? 100) >= 130) {
      nudges.push("Ask about statin suitability and potential side effects.");
      fired.push("lipids.statin_discuss");
    }
  }

  return { steps, nudges, fired, softAlerts };
}
