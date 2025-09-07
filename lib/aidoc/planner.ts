import type { RulesOut } from "./rules";

export function buildPersonalPlan(r: RulesOut, mem:any) {
  // Merge rules with preferences for nicer phrasing
  const timePref = (mem?.prefs||[]).find((p:any)=>p.key==="pref_test_time")?.value;
  const steps = r.steps.map(s => s.replace("Prefer morning", `Prefer ${timePref||"morning"}`));
  return {
    title: "Personalized next steps",
    steps,
    nudges: r.nudges,
    rulesFired: r.fired,
  };
}
