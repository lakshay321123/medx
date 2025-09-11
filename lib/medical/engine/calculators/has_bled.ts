// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type HASBLEDInputs = {
  uncontrolled_htn_sbp_gt_160: boolean;
  abnormal_renal: boolean;
  abnormal_liver: boolean;
  stroke_history: boolean;
  bleeding_history: boolean;
  labile_inr: boolean;
  age_gt_65: boolean;
  drugs: boolean;
  alcohol: boolean;
};

export function calc_has_bled(i: HASBLEDInputs): number {
  let s = 0;
  if (i.uncontrolled_htn_sbp_gt_160) s += 1;
  if (i.abnormal_renal) s += 1;
  if (i.abnormal_liver) s += 1;
  if (i.stroke_history) s += 1;
  if (i.bleeding_history) s += 1;
  if (i.labile_inr) s += 1;
  if (i.age_gt_65) s += 1;
  if (i.drugs) s += 1;
  if (i.alcohol) s += 1;
  return s;
}

const def = {
  id: "has_bled",
  label: "HAS-BLED (bleeding risk)",
  inputs: [
    { id: "uncontrolled_htn_sbp_gt_160", label: "Uncontrolled HTN (SBP >160)", type: "boolean" },
    { id: "abnormal_renal", label: "Abnormal renal function", type: "boolean" },
    { id: "abnormal_liver", label: "Abnormal liver function", type: "boolean" },
    { id: "stroke_history", label: "Stroke history", type: "boolean" },
    { id: "bleeding_history", label: "Bleeding history or predisposition", type: "boolean" },
    { id: "labile_inr", label: "Labile INR", type: "boolean" },
    { id: "age_gt_65", label: "Age >65", type: "boolean" },
    { id: "drugs", label: "Drugs (antiplatelet/NSAIDs)", type: "boolean" },
    { id: "alcohol", label: "Alcohol use", type: "boolean" }
  ],
  run: (args: HASBLEDInputs) => {
    const v = calc_has_bled(args);
    return { id: "has_bled", label: "HAS-BLED", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
