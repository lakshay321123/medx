export type AnionGapInputs = { na_mmol_l: number; cl_mmol_l: number; hco3_mmol_l: number; albumin_g_dl?: number };

export function calc_anion_gap(i: AnionGapInputs): { ag: number; corrected_ag?: number } {
  const ag = i.na_mmol_l - (i.cl_mmol_l + i.hco3_mmol_l);
  let corrected: number | undefined = undefined;
  if (typeof i.albumin_g_dl === "number") {
    corrected = ag + 2.5 * (4.0 - i.albumin_g_dl);
  }
  return { ag, corrected_ag: corrected };
}

const def = {
  id: "anion_gap",
  label: "Anion Gap (± albumin-corrected)",
  inputs: [
    { id: "na_mmol_l", label: "Na (mmol/L)", type: "number", min: 80, max: 200 },
    { id: "cl_mmol_l", label: "Cl (mmol/L)", type: "number", min: 50, max: 200 },
    { id: "hco3_mmol_l", label: "HCO3⁻ (mmol/L)", type: "number", min: 0, max: 60 },
    { id: "albumin_g_dl", label: "Albumin (g/dL)", type: "number", min: 0, max: 10 }
  ],
  run: (args: AnionGapInputs) => {
    const r = calc_anion_gap(args);
    const notes = [typeof r.corrected_ag === "number" ? `Corrected AG ${r.corrected_ag.toFixed(1)}` : ""];
    return { id: "anion_gap", label: "Anion Gap", value: r.ag, unit: "mmol/L", precision: 1, notes: notes.filter(Boolean), extra: r };
  },
};

export default def;
