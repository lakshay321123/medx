export type CorrCaInputs = { measured_ca_mg_dl: number; albumin_g_dl: number };

export function calc_corrected_calcium(i: CorrCaInputs): number {
  return i.measured_ca_mg_dl + 0.8 * (4.0 - i.albumin_g_dl);
}

const def = {
  id: "corrected_calcium",
  label: "Corrected Calcium (albumin)",
  inputs: [
    { id: "measured_ca_mg_dl", label: "Measured Ca (mg/dL)", type: "number", min: 0 },
    { id: "albumin_g_dl", label: "Albumin (g/dL)", type: "number", min: 0 }
  ],
  run: (args: CorrCaInputs) => {
    const v = calc_corrected_calcium(args);
    return { id: "corrected_calcium", label: "Corrected Ca", value: v, unit: "mg/dL", precision: 1, notes: [] };
  },
};

export default def;
