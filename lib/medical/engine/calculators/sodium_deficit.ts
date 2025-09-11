// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type NaDefInputs = {
  sex: "male" | "female";
  weight_kg: number;
  current_na_mmol_l: number;
  target_na_mmol_l: number;
};

export function calc_sodium_deficit(i: NaDefInputs): number {
  const tbw_factor = i.sex === "male" ? 0.6 : 0.5;
  const tbw = tbw_factor * i.weight_kg;
  return tbw * (i.target_na_mmol_l - i.current_na_mmol_l);
}

const def = {
  id: "sodium_deficit",
  label: "Sodium Deficit (mEq)",
  inputs: [
    { id: "sex", label: "Sex", type: "select", options: [{label:"Male", value:"male"},{label:"Female", value:"female"}]},
    { id: "weight_kg", label: "Weight (kg)", type: "number", min: 1, max: 300 },
    { id: "current_na_mmol_l", label: "Current Na (mmol/L)", type: "number", min: 80, max: 200 },
    { id: "target_na_mmol_l", label: "Target Na (mmol/L)", type: "number", min: 80, max: 200 }
  ],
  run: (args: NaDefInputs) => {
    const v = calc_sodium_deficit(args);
    return { id: "sodium_deficit", label: "Sodium Deficit", value: v, unit: "mEq", precision: 0, notes: [] };
  },
};

export default def;
