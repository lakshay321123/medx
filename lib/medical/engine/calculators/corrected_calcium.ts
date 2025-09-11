// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type CorrectedCalciumInputs = {
  calcium_mg_dl: number;
  albumin_g_dl: number;
};

export function calc_corrected_calcium({ calcium_mg_dl, albumin_g_dl }: CorrectedCalciumInputs): number {
  return calcium_mg_dl + 0.8 * (4.0 - albumin_g_dl);
}

const def = {
  id: "corrected_calcium",
  label: "Corrected Calcium (albumin)",
  inputs: [
    { id: "calcium_mg_dl", label: "Calcium (mg/dL)", type: "number", min: 0 },
    { id: "albumin_g_dl", label: "Albumin (g/dL)", type: "number", min: 0 }
  ],
  run: (args: CorrectedCalciumInputs) => {
    const v = calc_corrected_calcium(args);
    return { id: "corrected_calcium", label: "Corrected Calcium", value: v, unit: "mg/dL", precision: 2, notes: [] };
  },
};

export default def;
