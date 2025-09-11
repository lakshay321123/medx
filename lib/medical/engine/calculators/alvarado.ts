// Batch 14 calculator
export type AlvaradoInputs = {
  migration_rlq: boolean;
  anorexia: boolean;
  nausea_vomiting: boolean;
  rlq_tenderness: boolean;
  rebound_pain: boolean;
  fever_c: number; // objective fever >= 37.3C
  leukocytosis_wbc_k: number; // >=10
  neutrophil_left_shift: boolean; // >=75% neutrophils
};

export function calc_alvarado(i: AlvaradoInputs): { score: number; risk: "low"|"intermediate"|"high" } {
  let s = 0;
  if (i.migration_rlq) s += 1;
  if (i.anorexia) s += 1;
  if (i.nausea_vomiting) s += 1;
  if (i.rlq_tenderness) s += 2;
  if (i.rebound_pain) s += 1;
  if (i.fever_c >= 37.3) s += 1;
  if (i.leukocytosis_wbc_k >= 10) s += 2;
  if (i.neutrophil_left_shift) s += 1;
  let risk: "low"|"intermediate"|"high" = "low";
  if (s >= 7) risk = "high";
  else if (s >= 5) risk = "intermediate";
  return { score: s, risk };
}

const def = {
  id: "alvarado",
  label: "Alvarado Score (appendicitis)",
  inputs: [
    { id: "migration_rlq", label: "Migration to RLQ", type: "boolean" },
    { id: "anorexia", label: "Anorexia", type: "boolean" },
    { id: "nausea_vomiting", label: "Nausea/Vomiting", type: "boolean" },
    { id: "rlq_tenderness", label: "RLQ tenderness", type: "boolean" },
    { id: "rebound_pain", label: "Rebound pain", type: "boolean" },
    { id: "fever_c", label: "Fever (°C)", type: "number", min: 30, max: 43 },
    { id: "leukocytosis_wbc_k", label: "Leukocytosis (WBC ×10³/µL)", type: "number", min: 0 },
    { id: "neutrophil_left_shift", label: "Left shift (≥75% neutrophils)", type: "boolean" }
  ],
  run: (args: AlvaradoInputs) => {
    const r = calc_alvarado(args);
    const notes = [r.risk];
    return { id: "alvarado", label: "Alvarado Score", value: r.score, unit: "points", precision: 0, notes, extra: r };
  },
};

export default def;
