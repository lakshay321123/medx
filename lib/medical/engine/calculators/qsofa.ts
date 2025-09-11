export type qSOFAInputs = { rr:number; sbp:number; gcs:number };

export function calc_qsofa(i: qSOFAInputs): { score:number; high_risk:boolean } {
  let s = 0;
  if (i.rr >= 22) s++;
  if (i.sbp <= 100) s++;
  if (i.gcs < 15) s++;
  return { score: s, high_risk: s >= 2 };
}

const def = {
  id: "qsofa",
  label: "qSOFA",
  inputs: [
    { id: "rr", label: "Respiratory rate (breaths/min)", type: "number", min: 0 },
    { id: "sbp", label: "Systolic BP (mmHg)", type: "number", min: 0 },
    { id: "gcs", label: "GCS", type: "number", min: 3, max: 15 }
  ],
  run: (args: qSOFAInputs) => {
    const r = calc_qsofa(args);
    const notes = [r.high_risk ? "High risk (≥2)" : ""];
    return { id: "qsofa", label: "qSOFA", value: r.score, unit: "criteria", precision: 0, notes: notes.filter(Boolean), extra: r };
  },
};

export default def;
