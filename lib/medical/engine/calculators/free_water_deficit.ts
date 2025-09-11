export type FWDInputs = { weight_kg:number; sex:"male"|"female"; serum_na_mmol_l:number };

export function calc_free_water_deficit(i: FWDInputs): number {
  const tbw = (i.sex === "male" ? 0.6 : 0.5) * i.weight_kg;
  return tbw * (i.serum_na_mmol_l/140 - 1);
}

const def = {
  id: "free_water_deficit",
  label: "Free Water Deficit (hypernatremia)",
  inputs: [
    { id: "weight_kg", label: "Weight (kg)", type: "number", min: 1, max: 400 },
    { id: "sex", label: "Sex", type: "select", options:[{label:"Male",value:"male"},{label:"Female",value:"female"}] },
    { id: "serum_na_mmol_l", label: "Serum Na (mmol/L)", type: "number", min: 120, max: 200 }
  ],
  run: (args: FWDInputs) => {
    const v = calc_free_water_deficit(args);
    return { id: "free_water_deficit", label: "Free Water Deficit", value: v, unit: "L", precision: 2, notes: [] };
  },
};

export default def;
