// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type HasBledInputs = {
  age_years: number;
  htn_sbp_gt_160: boolean;
  abnormal_renal: boolean;
  abnormal_liver: boolean;
  stroke_history: boolean;
  bleeding_history: boolean;
  labile_inr: boolean;
  drugs_predisposing: boolean; // antiplatelets/NSAIDs
  alcohol_excess: boolean;     // >=8 drinks/week
};

export function calc_has_bled(i: HasBledInputs): number {
  let s = 0;
  if (i.htn_sbp_gt_160) s += 1;
  if (i.abnormal_renal) s += 1;
  if (i.abnormal_liver) s += 1;
  if (i.stroke_history) s += 1;
  if (i.bleeding_history) s += 1;
  if (i.labile_inr) s += 1;
  if (i.age_years > 65) s += 1;
  if (i.drugs_predisposing) s += 1;
  if (i.alcohol_excess) s += 1;
  return s;
}

const def = {
  id: "has_bled",
  label: "HAS-BLED (Bleeding risk)",
  inputs: [
    { id: "age_years", label: "Age", type: "number", min: 0, max: 120 },
    { id: "htn_sbp_gt_160", label: "Hypertension (SBP >160)", type: "boolean" },
    { id: "abnormal_renal", label: "Abnormal renal function", type: "boolean" },
    { id: "abnormal_liver", label: "Abnormal liver function", type: "boolean" },
    { id: "stroke_history", label: "Stroke history", type: "boolean" },
    { id: "bleeding_history", label: "Bleeding history/predisposition", type: "boolean" },
    { id: "labile_inr", label: "Labile INR", type: "boolean" },
    { id: "drugs_predisposing", label: "Drugs (antiplatelets/NSAIDs)", type: "boolean" },
    { id: "alcohol_excess", label: "Alcohol excess", type: "boolean" }
  ],
  run: (args: HasBledInputs) => {
    const v = calc_has_bled(args);
    return { id: "has_bled", label: "HAS-BLED", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
