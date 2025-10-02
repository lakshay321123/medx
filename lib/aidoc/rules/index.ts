import { diabetesRules } from "./diabetes";
import { lipidsRules } from "./lipids";
import { htnRules } from "./htn";
import { thyroidRules } from "./thyroid";
import { anemiaRules } from "./anemia";
import { computeTrendStats } from "../trends";

type RuleBucket = { steps: string[]; nudges: string[]; fired: string[]; softAlerts: any[] };

const emptyBucket = (): RuleBucket => ({ steps: [], nudges: [], fired: [], softAlerts: [] });

function mergeBuckets(buckets: RuleBucket[]): RuleBucket {
  return {
    steps: Array.from(new Set(buckets.flatMap((b) => b.steps))),
    nudges: Array.from(new Set(buckets.flatMap((b) => b.nudges))),
    fired: Array.from(new Set(buckets.flatMap((b) => b.fired))),
    softAlerts: buckets.flatMap((b) => b.softAlerts),
  };
}

function crossReportTrendRules(ctx: { labs: any[] }): RuleBucket {
  const labs = Array.isArray(ctx.labs) ? ctx.labs : [];
  if (!labs.length) return emptyBucket();
  const byName = new Map<string, any[]>();
  for (const lab of labs) {
    if (!lab?.name || typeof lab.value !== "number" || !lab.takenAt) continue;
    const key = String(lab.name).toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(lab);
  }
  const bucket = emptyBucket();
  for (const [name, series] of byName.entries()) {
    if (series.length < 2) continue;
    const stats = computeTrendStats(
      series.map((entry) => ({
        date: new Date(entry.takenAt).toISOString().slice(0, 10),
        value: Number(entry.value),
        unit: entry.unit ?? null,
      })),
    );
    if (!stats || !stats.previous) continue;
    const unit = stats.latest.unit ? ` ${stats.latest.unit}` : "";
    const label = name.toUpperCase();
    const rising = stats.direction === "rising";
    const falling = stats.direction === "falling";
    const high = typeof series[series.length - 1]?.refHigh === "number" && stats.latest.value > Number(series[series.length - 1].refHigh);
    const low = typeof series[series.length - 1]?.refLow === "number" && stats.latest.value < Number(series[series.length - 1].refLow);
    if (rising || falling) {
      bucket.steps.push(
        `${label} ${rising ? "is rising" : "is falling"}; latest ${stats.latest.value}${unit} (prev ${stats.previous.value}${unit}).`,
      );
      bucket.fired.push(`trend:${label}:${stats.direction}`);
    }
    if (high || low) {
      bucket.softAlerts.push(
        `${label} ${high ? "above" : "below"} goal at ${stats.latest.value}${unit}; review management.`,
      );
    }
  }
  return bucket;
}

function nonLabReportRules(ctx: { notes?: any[] }): RuleBucket {
  const notes = Array.isArray(ctx.notes) ? ctx.notes : [];
  if (!notes.length) return emptyBucket();
  const bucket = emptyBucket();
  for (const note of notes) {
    const text = String(note?.body ?? "").toLowerCase();
    if (!text) continue;
    if (/fracture|break|radius|ulna|femur/.test(text)) {
      bucket.steps.push("Rehabilitate fracture: ensure bone health follow-up and physiotherapy as advised.");
      bucket.nudges.push("Schedule orthopedic review if pain or mobility issues recur.");
      bucket.fired.push("nonlab:fracture");
    }
    if (/imaging|mri|x-ray|ct|scan/.test(text)) {
      bucket.nudges.push("Add imaging summary to personal record for future reference.");
      bucket.fired.push("nonlab:imaging");
    }
  }
  return bucket;
}

export type RulesOut = { steps:string[]; nudges:string[]; fired:string[]; softAlerts:any[] };

export function runRules(ctx:{labs:any[]; meds:any[]; conditions:any[]; vitals?:any[]; mem:any; notes?: any[]}): RulesOut {
  const buckets: RuleBucket[] = [
    diabetesRules(ctx),
    lipidsRules(ctx),
    htnRules(ctx),
    thyroidRules(ctx),
    anemiaRules(ctx),
    crossReportTrendRules(ctx),
    nonLabReportRules(ctx),
  ];
  const merged = mergeBuckets(buckets);
  return {
    steps: merged.steps,
    nudges: merged.nudges,
    fired: merged.fired,
    softAlerts: merged.softAlerts,
  };
}
