export type DeltaAGInputs = { na_mmol_l: number; cl_mmol_l: number; hco3_mmol_l: number };

export function calc_delta_ag(i: DeltaAGInputs): { ag: number; delta_gap: number } {
  const ag = i.na_mmol_l - (i.cl_mmol_l + i.hco3_mmol_l);
  const delta_ag = (ag - 12) - (24 - i.hco3_mmol_l);
  return { ag, delta_gap };
}

const def = {
  id: "delta_ag",
  label: "Delta Gap (mixed acid–base)",
  inputs: [
    { id: "na_mmol_l", label: "Na (mmol/L)", type: "number", min: 80, max: 200 },
    { id: "cl_mmol_l", label: "Cl (mmol/L)", type: "number", min: 50, max: 200 },
    { id: "hco3_mmol_l", label: "HCO3⁻ (mmol/L)", type: "number", min: 0, max: 60 }
  ],
  run: (args: DeltaAGInputs) => {
    const r = calc_delta_ag(args);
    const notes = [`AG ${r.ag.toFixed(1)}`, `Δgap ${r.delta_gap.toFixed(1)}`];
    return { id: "delta_ag", label: "Delta Gap", value: r.delta_gap, unit: "", precision: 1, notes, extra: r };
  },
};

export default def;
