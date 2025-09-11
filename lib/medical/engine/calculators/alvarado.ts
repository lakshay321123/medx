export type AlvaradoInputs = {
  migration_rlq: boolean;
  anorexia: boolean;
  nausea_vomiting: boolean;
  tenderness_rlq: boolean;
  rebound: boolean;
  elevated_temperature: boolean;
  leukocytosis: boolean;
  left_shift: boolean;
};

export function calc_alvarado(i: AlvaradoInputs): number {
  let s = 0;
  s += i.migration_rlq ? 1 : 0;
  s += i.anorexia ? 1 : 0;
  s += i.nausea_vomiting ? 1 : 0;
  s += i.tenderness_rlq ? 2 : 0;
  s += i.rebound ? 1 : 0;
  s += i.elevated_temperature ? 1 : 0;
  s += i.leukocytosis ? 2 : 0;
  s += i.left_shift ? 1 : 0;
  return s;
}

const def = {
  id: "alvarado",
  label: "Alvarado Score (appendicitis)",
  inputs: [
    { id: "migration_rlq", label: "Migration of pain to RLQ", type: "boolean" },
    { id: "anorexia", label: "Anorexia", type: "boolean" },
    { id: "nausea_vomiting", label: "Nausea/vomiting", type: "boolean" },
    { id: "tenderness_rlq", label: "Tenderness in RLQ", type: "boolean" },
    { id: "rebound", label: "Rebound pain", type: "boolean" },
    { id: "elevated_temperature", label: "Elevated temperature", type: "boolean" },
    { id: "leukocytosis", label: "Leukocytosis", type: "boolean" },
    { id: "left_shift", label: "Left shift (neutrophilia)", type: "boolean" }
  ],
  run: (args: AlvaradoInputs) => {
    const v = calc_alvarado(args);
    return { id: "alvarado", label: "Alvarado", value: v, unit: "points", precision: 0, notes: [] };
  },
};

export default def;
