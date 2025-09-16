export type AGInputs = { na_mmol_l:number; cl_mmol_l:number; hco3_mmol_l:number };

export function calc_anion_gap(i: AGInputs): number {
  return i.na_mmol_l - (i.cl_mmol_l + i.hco3_mmol_l);
}

const def = {
  id: "anion_gap",
  label: "Anion Gap (no K⁺)",
  inputs: [
    { id: "na_mmol_l", label: "Sodium", unit: "mmol/L", type: "number", min: 80, max: 200 },
    { id: "cl_mmol_l", label: "Chloride", unit: "mmol/L", type: "number", min: 50, max: 150 },
    { id: "hco3_mmol_l", label: "HCO₃⁻", unit: "mmol/L", type: "number", min: 0, max: 50 }
  ],
  run: (args: AGInputs) => {
    const v = calc_anion_gap(args);
    return { id: "anion_gap", label: "Anion Gap", value: v, unit: "mmol/L", precision: 0, notes: [] };
  },
};

export default def;
