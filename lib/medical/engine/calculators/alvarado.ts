export type AlvaradoInputs = {
  migration_rlq: boolean;
  anorexia: boolean;
  nausea_vomiting: boolean;
  rlq_tenderness: boolean;
  rebound_pain: boolean;
  fever: boolean;
  leukocytosis: boolean;
  left_shift: boolean;
};

export function calc_alvarado(i: AlvaradoInputs): number {
  let s = 0;
  if (i.migration_rlq) s += 1;
  if (i.anorexia) s += 1;
  if (i.nausea_vomiting) s += 1;
  if (i.rlq_tenderness) s += 2;
  if (i.rebound_pain) s += 1;
  if (i.fever) s += 1;
  if (i.leukocytosis) s += 2;
  if (i.left_shift) s += 1;
  return s;
}

const def = {
  id: "alvarado",
  label: "Alvarado Score (appendicitis)",
  inputs: [
    { id: "migration_rlq", label: "Migration of pain to RLQ", type: "boolean" },
    { id: "anorexia", label: "Anorexia", type: "boolean" },
    { id: "nausea_vomiting", label: "Nausea/vomiting", type: "boolean" },
    { id: "rlq_tenderness", label: "RLQ tenderness", type: "boolean" },
    { id: "rebound_pain", label: "Rebound pain", type: "boolean" },
    { id: "fever", label: "Fever", type: "boolean" },
    { id: "leukocytosis", label: "Leukocytosis", type: "boolean" },
    { id: "left_shift", label: "Left shift (neutrophilia)", type: "boolean" }
  ],
  run: (args: AlvaradoInputs) => {
    const v = calc_alvarado(args);
    return { id: "alvarado", label: "Alvarado", value: v, unit: "points", precision: 0, notes: [] };
  },
};

export default def;
