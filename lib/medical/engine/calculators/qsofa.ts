export type qSOFAInputs = { sbp_mm_hg: number; rr_bpm: number; gcs_lt_15: boolean };

export function calc_qsofa(i: qSOFAInputs): number {
  let s = 0;
  s += (i.sbp_mm_hg <= 100) ? 1 : 0;
  s += (i.rr_bpm >= 22) ? 1 : 0;
  s += i.gcs_lt_15 ? 1 : 0;
  return s;
}

const def = {
  id: "qsofa",
  label: "qSOFA (sepsis risk)",
  inputs: [
    { id: "sbp_mm_hg", label: "Systolic BP (mmHg)", type: "number", min: 0 },
    { id: "rr_bpm", label: "Respiratory rate (breaths/min)", type: "number", min: 0 },
    { id: "gcs_lt_15", label: "Altered mentation (GCS<15)", type: "boolean" }
  ],
  run: (args: qSOFAInputs) => {
    const v = calc_qsofa(args);
    const notes = [v >= 2 ? "high risk (≥2)" : ""];
    return { id: "qsofa", label: "qSOFA", value: v, unit: "criteria", precision: 0, notes: notes.filter(Boolean) };
  },
};

export default def;
