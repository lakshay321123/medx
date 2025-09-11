// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.


export type AlvaradoInputs = {
  migration_rlq: boolean;
  anorexia: boolean;
  nausea_vomiting: boolean;
  rlq_tenderness: boolean;
  rebound_pain: boolean;
  temp_c: number;
  wbc_10e9_l: number;
  neutrophils_percent: number;
};

export function calc_alvarado(i: AlvaradoInputs): number {
  let s = 0;
  if (i.migration_rlq) s += 1;
  if (i.anorexia) s += 1;
  if (i.nausea_vomiting) s += 1;
  if (i.rlq_tenderness) s += 2;
  if (i.rebound_pain) s += 1;
  if (i.temp_c >= 37.3) s += 1;
  if (i.wbc_10e9_l > 10) s += 2;
  if (i.neutrophils_percent >= 75) s += 1;
  return s;
}

const def = {
  id: "alvarado",
  label: "Alvarado (Appendicitis)",
  inputs: [
    { id: "migration_rlq", label: "Migration of pain to RLQ", type: "boolean" },
    { id: "anorexia", label: "Anorexia", type: "boolean" },
    { id: "nausea_vomiting", label: "Nausea/Vomiting", type: "boolean" },
    { id: "rlq_tenderness", label: "RLQ tenderness", type: "boolean" },
    { id: "rebound_pain", label: "Rebound pain", type: "boolean" },
    { id: "temp_c", label: "Temperature (°C)", type: "number", min: 25, max: 45 },
    { id: "wbc_10e9_l", label: "WBC (×10^9/L)", type: "number", min: 0 },
    { id: "neutrophils_percent", label: "Neutrophils (%)", type: "number", min: 0, max: 100 }
  ],
  run: (args: AlvaradoInputs) => {
    const v = calc_alvarado(args);
    return { id: "alvarado", label: "Alvarado", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
