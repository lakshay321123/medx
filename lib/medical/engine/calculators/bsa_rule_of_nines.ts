
import { register } from "../registry";
export interface RuleOfNinesInput {
  head?: boolean; arm_left?: boolean; arm_right?: boolean;
  trunk_anterior?: boolean; trunk_posterior?: boolean;
  leg_left?: boolean; leg_right?: boolean; perineum?: boolean;
}
export interface RuleOfNinesResult { tbsa_pct: number; }
export function runRuleOfNines(i: RuleOfNinesInput): RuleOfNinesResult {
  let pct = 0;
  if (i.head) pct += 9; if (i.arm_left) pct += 9; if (i.arm_right) pct += 9;
  if (i.trunk_anterior) pct += 18; if (i.trunk_posterior) pct += 18;
  if (i.leg_left) pct += 18; if (i.leg_right) pct += 18;
  if (i.perineum) pct += 1;
  return { tbsa_pct: pct };
}
register({
  id: "bsa_rule_of_nines",
  label: "TBSA (Rule of Nines)",
  inputs: [
    { key: "head" }, { key: "arm_left" }, { key: "arm_right" },
    { key: "trunk_anterior" }, { key: "trunk_posterior" },
    { key: "leg_left" }, { key: "leg_right" }, { key: "perineum" },
  ],
  run: (ctx: any) => {
    const r = runRuleOfNines(ctx);
    return { id: "bsa_rule_of_nines", label: "TBSA", value: r.tbsa_pct, unit: "%", precision: 0 };
  },
});
