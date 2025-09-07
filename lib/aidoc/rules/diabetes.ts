import { latestLab, isStale, onMeds, parseFloatSafe } from "./utils";

export function diabetesRules({ labs, meds, mem }:{ labs:any[]; meds:any[]; mem:any }) {
  const steps: string[] = [];
  const nudges: string[] = [];
  const fired: string[] = [];
  const softAlerts: any[] = [];

  const a1c = latestLab(labs, "HbA1c") || latestLab(labs,"HbA1C") || latestLab(labs,"A1C");
  const a1cVal = parseFloatSafe(a1c?.value);
  const a1cStale = !a1c || isStale(a1c, 90);

  if (a1cStale) {
    const when = (mem?.prefs||[]).find((p:any)=>p.key==="pref_test_time")?.value || "morning";
    steps.push(`Repeat HbA1c (stale/missing). Prefer ${when} fasting sample.`);
    nudges.push("Schedule HbA1c within 7 days.");
    fired.push("diabetes.a1c_repeat");
  }

  const hasMetformin = onMeds(meds, "metformin");
  const metIntoler = (mem?.facts||[]).some((f:any)=>f.key==="intolerance_metformin" && f.value==="true");

  if (!a1cStale && a1cVal!=null) {
    if (a1cVal >= 7.0) {
      if (hasMetformin && metIntoler) {
        steps.push("Discuss metformin intolerance; consider ER formulation or alternate first-line per clinician.");
        fired.push("diabetes.met_intolerance");
      } else if (!hasMetformin) {
        steps.push("Discuss starting Metformin (consider ER if GI symptoms).");
        fired.push("diabetes.start_metformin");
      } else {
        steps.push("Reinforce adherence and lifestyle; consider dose titration as per clinician.");
        fired.push("diabetes.titrate");
      }
    } else if (a1cVal >= 6.5) {
      steps.push("Borderline control—optimize lifestyle and recheck HbA1c in 3 months.");
      fired.push("diabetes.borderline");
    }
  }

  return { steps, nudges, fired, softAlerts };
}
