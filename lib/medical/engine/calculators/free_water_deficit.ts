export type FWDInputs = { sex: "male"|"female"; weight_kg: number; na_mmol_l: number; tbw_factor_override?: number };

export function total_body_water(sex: "male"|"female", weight_kg: number, tbw_factor_override?: number): number {
  const factor = typeof tbw_factor_override === "number" ? tbw_factor_override : (sex === "male" ? 0.6 : 0.5);
  return factor * weight_kg;
}

export function calc_free_water_deficit(i: FWDInputs): number {
  const tbw = total_body_water(i.sex, i.weight_kg, i.tbw_factor_override);
  return tbw * ((i.na_mmol_l / 140) - 1);
}

const def = {
  id: "free_water_deficit",
  label: "Free Water Deficit (hypernatremia)",
  inputs: [
    { id: "sex", label: "Sex", type: "select", options: [{label:"Male", value:"male"},{label:"Female", value:"female"}] },
    { id: "weight_kg", label: "Weight (kg)", type: "number", min: 1, max: 300 },
    { id: "na_mmol_l", label: "Serum Na (mmol/L)", type: "number", min: 100, max: 200 },
    { id: "tbw_factor_override", label: "TBW factor override (0–1)", type: "number", min: 0, max: 1 }
  ],
  run: (args: FWDInputs) => {
    const v = calc_free_water_deficit(args);
    return { id: "free_water_deficit", label: "Free Water Deficit", value: v, unit: "L", precision: 1, notes: [] };
  },
};

export default def;
