// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type qSOFAInputs = {
  rr_per_min: number;
  sbp_mm_hg: number;
  gcs_total: number;
};

export function calc_qsofa({ rr_per_min, sbp_mm_hg, gcs_total }: qSOFAInputs): number {
  let s = 0;
  if (rr_per_min >= 22) s += 1;
  if (sbp_mm_hg <= 100) s += 1;
  if (gcs_total < 15) s += 1;
  return s;
}

const def = {
  id: "qsofa",
  label: "qSOFA",
  inputs: [
    { id: "rr_per_min", label: "Respiratory rate (/min)", type: "number", min: 0 },
    { id: "sbp_mm_hg", label: "SBP (mmHg)", type: "number", min: 0 },
    { id: "gcs_total", label: "GCS total", type: "number", min: 3, max: 15 }
  ],
  run: (args: qSOFAInputs) => {
    const v = calc_qsofa(args);
    return { id: "qsofa", label: "qSOFA", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
