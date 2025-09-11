export type DeltaAGInputs = { na_mmol_l:number; cl_mmol_l:number; hco3_mmol_l:number };

export function calc_delta_ag(i: DeltaAGInputs): { ag:number; delta_ag:number } {
  const ag = i.na_mmol_l - (i.cl_mmol_l + i.hco3_mmol_l);
  const delta_ag = (ag - 12) - (24 - i.hco3_mmol_l);
  return { ag, delta_ag };
}

const def = {
  id: "delta_ag",
  label: "Delta Anion Gap",
  inputs: [
    { id: "na_mmol_l", label: "Sodium (mmol/L)", type: "number", min: 80, max: 200 },
    { id: "cl_mmol_l", label: "Chloride (mmol/L)", type: "number", min: 50, max: 150 },
    { id: "hco3_mmol_l", label: "HCO₃⁻ (mmol/L)", type: "number", min: 0, max: 50 }
  ],
  run: (args: DeltaAGInputs) => {
    const r = calc_delta_ag(args);
    const notes = [`AG ${r.ag.toFixed(0)}`];
    return { id: "delta_ag", label: "Delta AG", value: r.delta_ag, unit: "mmol/L", precision: 0, notes, extra: r };
  },
};

export default def;
