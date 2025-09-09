import type { RulesOut } from "./rules";
import { redflagChecks } from "./rules/redflags"; // Additive import: red-flag library (local to AI Doc only)

export function buildPersonalPlan(
  r: RulesOut,
  mem: any,
  extra?: { vitals?: any; symptomsText?: string }
) {
  const timePref = (mem?.prefs || []).find(
    (p: any) => p.key === "pref_test_time"
  )?.value;
  const steps = r.steps.map((s) =>
    s.replace("Prefer morning", `Prefer ${timePref || "morning"}`)
  );

  const plan: any = {
    title: "Personalized next steps",
    steps: Array.from(new Set(steps)),
    nudges: r.nudges,
    rulesFired: r.fired,
  };

  try {
    const vitals = (extra as any)?.vitals ?? undefined;
    const symptomsText = (extra as any)?.symptomsText ?? "";
    const alerts = redflagChecks({ vitals, symptomsText });
    if (alerts && alerts.length) {
      const existing = ((plan as any).softAlerts ?? r.softAlerts ?? []) as string[];
      (plan as any).softAlerts = Array.from(new Set([...existing, ...alerts]));
    } else if (r.softAlerts && r.softAlerts.length) {
      (plan as any).softAlerts = Array.from(new Set(r.softAlerts));
    }
  } catch {
    if (r.softAlerts && r.softAlerts.length) {
      (plan as any).softAlerts = Array.from(new Set(r.softAlerts));
    }
    // never throw from planner for alerts
  }

  return plan;
}
