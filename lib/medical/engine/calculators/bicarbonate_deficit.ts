// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type BicarbDefInputs = {
  sex: "male" | "female";
  weight_kg: number;
  current_hco3_mmol_l: number;
  target_hco3_mmol_l: number;
};

export function calc_bicarbonate_deficit(i: BicarbDefInputs): number {
  const tbw = (i.sex === "male" ? 0.6 : 0.5) * i.weight_kg;
  return (i.target_hco3_mmol_l - i.current_hco3_mmol_l) * tbw;
}

const def = {
  id: "bicarbonate_deficit",
  label: "Bicarbonate Deficit",
  inputs: [
    { id: "sex", label: "Sex", type: "select", options: [{label:"Male", value:"male"},{label:"Female", value:"female"}] },
    { id: "weight_kg", label: "Weight (kg)", type: "number", min: 1, max: 300 },
    { id: "current_hco3_mmol_l", label: "Current HCO3⁻ (mmol/L)", type: "number", min: 0, max: 60 },
    { id: "target_hco3_mmol_l", label: "Target HCO3⁻ (mmol/L)", type: "number", min: 0, max: 60 }
  ],
  run: (args: BicarbDefInputs) => {
    const v = calc_bicarbonate_deficit(args);
    return { id: "bicarbonate_deficit", label: "Bicarbonate Deficit", value: v, unit: "mEq", precision: 0, notes: [] };
  },
};

export default def;
