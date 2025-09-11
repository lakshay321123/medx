// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type AnionGapInputs = {
  sodium_mmol_l: number;
  chloride_mmol_l: number;
  bicarbonate_mmol_l: number;
  albumin_g_dl?: number;
};

export function calc_anion_gap(i: AnionGapInputs): { ag: number; corrected?: number } {
  const ag = i.sodium_mmol_l - (i.chloride_mmol_l + i.bicarbonate_mmol_l);
  const out: { ag: number; corrected?: number } = { ag };
  if (typeof i.albumin_g_dl === "number") {
    out.corrected = ag + 2.5 * (4.0 - i.albumin_g_dl);
  }
  return out;
}

const def = {
  id: "anion_gap",
  label: "Anion Gap",
  inputs: [
    { id: "sodium_mmol_l", label: "Na (mmol/L)", type: "number", min: 80, max: 200 },
    { id: "chloride_mmol_l", label: "Cl (mmol/L)", type: "number", min: 50, max: 150 },
    { id: "bicarbonate_mmol_l", label: "HCO3⁻ (mmol/L)", type: "number", min: 0, max: 60 },
    { id: "albumin_g_dl", label: "Albumin (g/dL)", type: "number", min: 0, max: 6 }
  ],
  run: (args: AnionGapInputs) => {
    const r = calc_anion_gap(args);
    const notes: string[] = [];
    if (typeof r.corrected === "number") notes.push(`Corrected AG ${r.corrected.toFixed(1)}`);
    return { id: "anion_gap", label: "Anion Gap", value: r.ag, unit: "mmol/L", precision: 1, notes, extra: r };
  },
};

export default def;
