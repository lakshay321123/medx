import type { RulesOut } from "./rules";
import { redflagChecks } from "./rules/redflags"; // local red-flag checks

export { computeTrendStats, describeTrend } from "./trends";
export type { TrendPoint, TrendStats } from "./trends";

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
    const alerts = redflagChecks({ vitals, symptomsText }) || [];
    const merged = [...(r.softAlerts ?? []), ...alerts];
    if (merged.length) {
      (plan as any).softAlerts = Array.from(new Set(merged));
    }
  } catch {
    if (r.softAlerts?.length) {
      (plan as any).softAlerts = Array.from(new Set(r.softAlerts));
    }
    // never throw from planner for alerts
  }

  return plan;
}
