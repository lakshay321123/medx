// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type FWDInputs = {
  sex: "male" | "female";
  weight_kg: number;
  sodium_mmol_l: number;
};

export function calc_free_water_deficit({ sex, weight_kg, sodium_mmol_l }: FWDInputs): number {
  const tbw_factor = sex === "male" ? 0.6 : 0.5;
  const tbw = tbw_factor * weight_kg;
  return tbw * (sodium_mmol_l / 140 - 1);
}

const def = {
  id: "free_water_deficit",
  label: "Free Water Deficit",
  inputs: [
    { id: "sex", label: "Sex", type: "select", options: [{label:"Male", value:"male"}, {label:"Female", value:"female"}] },
    { id: "weight_kg", label: "Weight (kg)", type: "number", min: 1, max: 300 },
    { id: "sodium_mmol_l", label: "Na (mmol/L)", type: "number", min: 120, max: 200 }
  ],
  run: (args: FWDInputs) => {
    const v = calc_free_water_deficit(args);
    return { id: "free_water_deficit", label: "Free Water Deficit", value: v, unit: "L", precision: 2, notes: [] };
  },
};

export default def;
