// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.

export type MaddreyInputs = {
  pt_patient_sec: number;
  pt_control_sec: number;
  bilirubin_mg_dl: number;
};

export function calc_maddrey_df({ pt_patient_sec, pt_control_sec, bilirubin_mg_dl }: MaddreyInputs): number {
  if (pt_control_sec <= 0) return NaN;
  const pt_prolong = pt_patient_sec - pt_control_sec;
  return 4.6 * pt_prolong + bilirubin_mg_dl;
}

const def = {
  id: "maddrey_df",
  label: "Maddrey Discriminant Function",
  inputs: [
    { id: "pt_patient_sec", label: "PT (patient, sec)", type: "number", min: 0 },
    { id: "pt_control_sec", label: "PT (control, sec)", type: "number", min: 0 },
    { id: "bilirubin_mg_dl", label: "Bilirubin (mg/dL)", type: "number", min: 0 }
  ],
  run: ({ pt_patient_sec, pt_control_sec, bilirubin_mg_dl }: MaddreyInputs) => {
    const v = calc_maddrey_df({ pt_patient_sec, pt_control_sec, bilirubin_mg_dl });
    const notes = [v >= 32 ? "severe (>=32)" : ""];
    return { id: "maddrey_df", label: "Maddrey DF", value: v, unit: "score", precision: 1, notes };
  },
};

export default def;
