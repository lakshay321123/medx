// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type PERCInputs = {
  age_ge_50: boolean;
  hr_ge_100: boolean;
  sao2_lt_95: boolean;
  hemoptysis: boolean;
  estrogen_use: boolean;
  prior_dvt_pe: boolean;
  unilateral_leg_swelling: boolean;
  recent_surgery_trauma: boolean;
};

export function calc_perc(i: PERCInputs): number {
  let s = 0;
  if (i.age_ge_50) s += 1;
  if (i.hr_ge_100) s += 1;
  if (i.sao2_lt_95) s += 1;
  if (i.hemoptysis) s += 1;
  if (i.estrogen_use) s += 1;
  if (i.prior_dvt_pe) s += 1;
  if (i.unilateral_leg_swelling) s += 1;
  if (i.recent_surgery_trauma) s += 1;
  return s;
}

const def = {
  id: "perc_rule",
  label: "PERC Rule (PE)",
  inputs: [
    { id: "age_ge_50", label: "Age ≥50", type: "boolean" },
    { id: "hr_ge_100", label: "HR ≥100", type: "boolean" },
    { id: "sao2_lt_95", label: "SaO2 <95%", type: "boolean" },
    { id: "hemoptysis", label: "Hemoptysis", type: "boolean" },
    { id: "estrogen_use", label: "Estrogen use", type: "boolean" },
    { id: "prior_dvt_pe", label: "Prior DVT/PE", type: "boolean" },
    { id: "unilateral_leg_swelling", label: "Unilateral leg swelling", type: "boolean" },
    { id: "recent_surgery_trauma", label: "Recent surgery/trauma", type: "boolean" }
  ],
  run: (args: PERCInputs) => {
    const v = calc_perc(args);
    const notes = [v === 0 ? "PERC negative (if low pretest)" : "PERC positive"];
    return { id: "perc_rule", label: "PERC Rule", value: v, unit: "criteria", precision: 0, notes };
  },
};

export default def;
