// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type qSOFAInputs = { resp_rate: number; sbp: number; gcs: number };

export function calc_qsofa({ resp_rate, sbp, gcs }: qSOFAInputs): number {
  let s = 0;
  if (resp_rate >= 22) s += 1;
  if (sbp <= 100) s += 1;
  if (gcs < 15) s += 1;
  return s;
}

const def = {
  id: "qsofa",
  label: "qSOFA",
  inputs: [
    { id: "resp_rate", label: "Respiratory rate (/min)", type: "number", min: 0 },
    { id: "sbp", label: "Systolic BP (mmHg)", type: "number", min: 0 },
    { id: "gcs", label: "GCS", type: "number", min: 3, max: 15 }
  ],
  run: (args: qSOFAInputs) => {
    const v = calc_qsofa(args);
    return { id: "qsofa", label: "qSOFA", value: v, unit: "criteria", precision: 0, notes: [] };
  },
};

export default def;
