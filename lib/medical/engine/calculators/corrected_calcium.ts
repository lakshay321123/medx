// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type CorrCaInputs = { calcium_mg_dl: number; albumin_g_dl: number };

export function calc_corrected_calcium({ calcium_mg_dl, albumin_g_dl }: CorrCaInputs): number {
  return calcium_mg_dl + 0.8 * (4 - albumin_g_dl);
}

const def = {
  id: "corrected_calcium",
  label: "Corrected Calcium (albumin)",
  inputs: [
    { id: "calcium_mg_dl", label: "Calcium (mg/dL)", type: "number", min: 0 },
    { id: "albumin_g_dl", label: "Albumin (g/dL)", type: "number", min: 0 }
  ],
  run: (args: CorrCaInputs) => {
    const v = calc_corrected_calcium(args);
    return { id: "corrected_calcium", label: "Corrected Calcium", value: v, unit: "mg/dL", precision: 1, notes: [] };
  },
};

export default def;
