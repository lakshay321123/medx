export type NaDefInputs = { current_na_mmol_l:number; desired_na_mmol_l:number; weight_kg:number; sex:"male"|"female" };

export function calc_sodium_deficit(i: NaDefInputs): number {
  const tbw = (i.sex === "male" ? 0.6 : 0.5) * i.weight_kg;
  return (i.desired_na_mmol_l - i.current_na_mmol_l) * tbw;
}

const def = {
  id: "sodium_deficit",
  label: "Sodium Deficit (hyponatremia)",
  inputs: [
    { id: "current_na_mmol_l", label: "Current Na (mmol/L)", type: "number", min: 80, max: 200 },
    { id: "desired_na_mmol_l", label: "Desired Na (mmol/L)", type: "number", min: 80, max: 200 },
    { id: "weight_kg", label: "Weight (kg)", type: "number", min: 1, max: 400 },
    { id: "sex", label: "Sex", type: "select", options:[{label:"Male",value:"male"},{label:"Female",value:"female"}] }
  ],
  run: (args: NaDefInputs) => {
    const v = calc_sodium_deficit(args);
    return { id: "sodium_deficit", label: "Sodium Deficit", value: v, unit: "mmol", precision: 0, notes: [] };
  },
};

export default def;
