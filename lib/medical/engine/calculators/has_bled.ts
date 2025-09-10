import { register } from "../registry";
/**
 * HAS-BLED — major bleeding risk on anticoagulation
 * HTN (SBP>160), abnormal renal/liver, stroke, bleeding history, labile INR, age>65, drugs/alcohol
 */
export function calc_has_bled({ htn, renal, liver, stroke, bleeding, labil_inr, age_gt_65, drugs_alcohol }:
  { htn?: boolean, renal?: boolean, liver?: boolean, stroke?: boolean, bleeding?: boolean, labil_inr?: boolean, age_gt_65?: boolean, drugs_alcohol?: boolean }) {
  let s = 0;
  if (htn) s += 1;
  if (renal) s += 1;
  if (liver) s += 1;
  if (stroke) s += 1;
  if (bleeding) s += 1;
  if (labil_inr) s += 1;
  if (age_gt_65) s += 1;
  if (drugs_alcohol) s += 1;
  return s;
}

function hasBledNote(score: number): string {
  if (score >= 3) return "high bleeding risk — caution and regular review";
  if (score == 2) return "moderate risk";
  return "low risk";
}

register({
  id: "has_bled",
  label: "HAS-BLED",
  tags: ["cardiology"],
  inputs: [
    { key: "htn" },
    { key: "renal" },
    { key: "liver" },
    { key: "stroke" },
    { key: "bleeding" },
    { key: "labil_inr" },
    { key: "age_gt_65" },
    { key: "drugs_alcohol" },
  ],
  run: ({ htn, renal, liver, stroke, bleeding, labil_inr, age_gt_65, drugs_alcohol }) => {
    const v = calc_has_bled({ htn, renal, liver, stroke, bleeding, labil_inr, age_gt_65, drugs_alcohol });
    const notes = [hasBledNote(v)];
    return { id: "has_bled", label: "HAS-BLED", value: v, unit: "score", precision: 0, notes };
  },
});
