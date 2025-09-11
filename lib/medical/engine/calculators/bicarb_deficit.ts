export type BicarbDeficitInputs = { weight_kg: number; actual_hco3_mmol_l: number; desired_hco3_mmol_l: number };

export function calc_bicarb_deficit(i: BicarbDeficitInputs): number {
  const distribution = 0.5 * i.weight_kg; // L
  return (i.desired_hco3_mmol_l - i.actual_hco3_mmol_l) * distribution;
}

const def = {
  id: "bicarb_deficit",
  label: "Bicarbonate Deficit (metabolic acidosis)",
  inputs: [
    { id: "weight_kg", label: "Weight (kg)", type: "number", min: 1, max: 300 },
    { id: "actual_hco3_mmol_l", label: "Actual HCO3⁻ (mmol/L)", type: "number", min: 0, max: 60 },
    { id: "desired_hco3_mmol_l", label: "Desired HCO3⁻ (mmol/L)", type: "number", min: 0, max: 60 }
  ],
  run: (args: BicarbDeficitInputs) => {
    const v = calc_bicarb_deficit(args);
    return { id: "bicarb_deficit", label: "Bicarbonate Deficit", value: v, unit: "mEq", precision: 0, notes: [] };
  },
};

export default def;
