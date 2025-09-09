import { diabetesRules } from "./diabetes";
import { lipidsRules } from "./lipids";
import { htnRules } from "./htn";
import { thyroidRules } from "./thyroid";

export type RulesOut = { steps:string[]; nudges:string[]; fired:string[]; softAlerts:any[] };

export function runRules(ctx:{labs:any[]; meds:any[]; conditions:any[]; vitals?:any[]; mem:any}): RulesOut {
  const buckets = [
    diabetesRules(ctx),
    lipidsRules(ctx),
    htnRules(ctx),
    thyroidRules(ctx),
  ];
  return {
    steps: Array.from(new Set(buckets.flatMap(b=>b.steps))),
    nudges: Array.from(new Set(buckets.flatMap(b=>b.nudges))),
    fired: Array.from(new Set(buckets.flatMap(b=>b.fired))),
    softAlerts: buckets.flatMap(b=>b.softAlerts),
  };
}
