export type CorrCalciumInputs = { serum_ca_mg_dl: number; albumin_g_dl: number };

export function calc_corrected_calcium(i: CorrCalciumInputs): number {
  return i.serum_ca_mg_dl + 0.8 * (4.0 - i.albumin_g_dl);
}

const def = {
  id: "corrected_calcium",
  label: "Corrected Calcium (albumin)",
  inputs: [
    { id: "serum_ca_mg_dl", label: "Serum calcium (mg/dL)", type: "number", min: 0 },
    { id: "albumin_g_dl", label: "Albumin (g/dL)", type: "number", min: 0 }
  ],
  run: (args: CorrCalciumInputs) => {
    const v = calc_corrected_calcium(args);
    return { id: "corrected_calcium", label: "Corrected Calcium", value: v, unit: "mg/dL", precision: 1, notes: [] };
  },
};

export default def;
