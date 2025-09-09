import type { RulesOut } from "./rules";
import { redflagChecks } from "./rules/redflags";

export function buildPersonalPlan(r: RulesOut, mem:any, extra?: { vitals?: any; symptomsText?: string }) {
  const timePref = (mem?.prefs||[]).find((p:any)=>p.key==="pref_test_time")?.value;
  const steps = r.steps.map(s => s.replace("Prefer morning", `Prefer ${timePref||"morning"}`));
  const softAlerts = [...r.softAlerts, ...redflagChecks(extra || {})];
  return {
    title: "Personalized next steps",
    steps: Array.from(new Set(steps)),
    nudges: r.nudges,
    rulesFired: r.fired,
    softAlerts,
  };
}
