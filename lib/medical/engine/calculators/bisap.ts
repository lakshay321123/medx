// Batch 14 calculator
export type BISAPInputs = {
  bun_mg_dl: number;
  gcs: number;
  sirs_criteria_count: number; // 0–4
  age_years: number;
  pleural_effusion: boolean;
};

export function calc_bisap(i: BISAPInputs): { score: number; high_risk: boolean } {
  let s = 0;
  if (i.bun_mg_dl > 25) s += 1;
  if (i.gcs < 15) s += 1;
  if (i.sirs_criteria_count >= 2) s += 1;
  if (i.age_years > 60) s += 1;
  if (i.pleural_effusion) s += 1;
  return { score: s, high_risk: s >= 3 };
}

const def = {
  id: "bisap",
  label: "BISAP (acute pancreatitis)",
  inputs: [
    { id: "bun_mg_dl", label: "BUN (mg/dL)", type: "number", min: 0 },
    { id: "gcs", label: "GCS", type: "number", min: 3, max: 15, step: 1 },
    { id: "sirs_criteria_count", label: "SIRS criteria (0–4)", type: "number", min: 0, max: 4, step: 1 },
    { id: "age_years", label: "Age (years)", type: "number", min: 0, max: 120 },
    { id: "pleural_effusion", label: "Pleural effusion", type: "boolean" }
  ],
  run: (args: BISAPInputs) => {
    const r = calc_bisap(args);
    const notes = [r.high_risk ? "high risk (BISAP ≥3)" : "low/moderate risk"];
    return { id: "bisap", label: "BISAP", value: r.score, unit: "points", precision: 0, notes, extra: r };
  },
};

export default def;
