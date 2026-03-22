import { runRules, type RulesOut } from "@/lib/aidoc/rules";
import { buildPersonalPlan } from "@/lib/aidoc/planner";
import type { ProfileContext } from "./profileContext";

export function runConditionRules(ctx: ProfileContext): string {
  const conditions = ctx.conditions.map(c => c.toLowerCase());
  
  // Build fake labs/meds/vitals/mem for the rules engine
  const labs = Object.entries(ctx.vitals)
    .filter(([k]) => !["bp_systolic", "bp_diastolic", "heart_rate", "spo2"].includes(k))
    .map(([k, v]) => ({ name: k, value: v, takenAt: new Date().toISOString() }));
  
  const meds = ctx.medications.map(m => ({ name: m }));
  const vitals = [{
    sbp: ctx.vitals.bp_systolic,
    dbp: ctx.vitals.bp_diastolic,
    hr: ctx.vitals.heart_rate,
    spo2: ctx.vitals.spo2,
  }];
  const mem = { prefs: [], facts: [], redflags: [], goals: [] };

  try {
    const rulesOut = runRules({ labs, meds, vitals, mem, conditions });
    if (!rulesOut.steps.length && !rulesOut.nudges.length && !rulesOut.softAlerts?.length) return "";

    const plan = buildPersonalPlan(rulesOut, mem, { vitals: vitals[0] });
    
    const parts: string[] = [];
    if (plan.softAlerts?.length) {
      parts.push(`⚠️ ALERTS: ${plan.softAlerts.join("; ")}`);
    }
    if (plan.steps?.length) {
      parts.push(`PERSONALIZED STEPS: ${plan.steps.slice(0, 5).join("; ")}`);
    }
    if (plan.nudges?.length) {
      parts.push(`NUDGES: ${(plan.nudges || rulesOut.nudges).slice(0, 3).join("; ")}`);
    }
    return parts.length ? `[CLINICAL RULES ENGINE]\n${parts.join("\n")}` : "";
  } catch (err) {
    console.warn("[rulesRunner] Failed:", err);
    return "";
  }
}
