// Auto-generated. No placeholders. Typed run(args).
export type DeltaGapInputs = {
  sodium_mmol_l: number;
  chloride_mmol_l: number;
  hco3_mmol_l: number;
  normal_ag?: number;
  normal_hco3?: number;
};

export function calc_delta_gap(i: DeltaGapInputs): { ag: number; delta_ag: number; delta_bicarb: number; ratio: number } {
  const AG = i.sodium_mmol_l - (i.chloride_mmol_l + i.hco3_mmol_l);
  const nAG = typeof i.normal_ag === "number" ? i.normal_ag : 12;
  const nHCO3 = typeof i.normal_hco3 === "number" ? i.normal_hco3 : 24;
  const dAG = AG - nAG;
  const dHCO3 = nHCO3 - i.hco3_mmol_l;
  const ratio = (dHCO3 === 0) ? Number.POSITIVE_INFINITY : (dAG / dHCO3);
  return { ag: AG, delta_ag: dAG, delta_bicarb: dHCO3, ratio };
}

const def = {
  id: "delta_gap",
  label: "Delta Gap / Delta-Delta",
  inputs: [
    { id: "sodium_mmol_l", label: "Na (mmol/L)", type: "number", min: 80, max: 200 },
    { id: "chloride_mmol_l", label: "Cl (mmol/L)", type: "number", min: 50, max: 150 },
    { id: "hco3_mmol_l", label: "HCO3⁻ (mmol/L)", type: "number", min: 0, max: 60 },
    { id: "normal_ag", label: "Normal AG (default 12)", type: "number", min: 0, max: 20 },
    { id: "normal_hco3", label: "Normal HCO3⁻ (default 24)", type: "number", min: 10, max: 35 }
  ],
  run: (args: DeltaGapInputs) => {
    const r = calc_delta_gap(args);
    const notes = [`ΔAG ${r.delta_ag.toFixed(1)}`, `ΔHCO3 ${r.delta_bicarb.toFixed(1)}`, `Δ/Δ ${r.ratio.toFixed(2)}`];
    return { id: "delta_gap", label: "Delta Gap", value: r.ratio, unit: "ratio", precision: 2, notes, extra: r };
  },
};

export default def;
