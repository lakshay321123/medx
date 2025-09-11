// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type Ranson48hInputs = {
  hct_fall_percent: number;
  bun_rise_mg_dl: number;
  calcium_mg_dl: number;
  pao2_mm_hg: number;
  base_deficit_mEq_l: number;
  fluid_sequestration_l: number;
};

export function calc_ranson_48h(i: Ranson48hInputs): number {
  let s = 0;
  if (i.hct_fall_percent > 10) s += 1;
  if (i.bun_rise_mg_dl > 5) s += 1;
  if (i.calcium_mg_dl < 8) s += 1;
  if (i.pao2_mm_hg < 60) s += 1;
  if (i.base_deficit_mEq_l > 4) s += 1;
  if (i.fluid_sequestration_l > 6) s += 1;
  return s;
}

const def = {
  id: "ranson_48h",
  label: "Ranson Criteria (48h, non-gallstone)",
  inputs: [
    { id: "hct_fall_percent", label: "Hematocrit fall (%)", type: "number", min: 0, max: 100 },
    { id: "bun_rise_mg_dl", label: "BUN rise (mg/dL)", type: "number", min: -50, max: 100 },
    { id: "calcium_mg_dl", label: "Calcium (mg/dL)", type: "number", min: 0 },
    { id: "pao2_mm_hg", label: "PaO2 (mmHg)", type: "number", min: 0 },
    { id: "base_deficit_mEq_l", label: "Base deficit (mEq/L)", type: "number", min: -20, max: 40 },
    { id: "fluid_sequestration_l", label: "Fluid sequestration (L)", type: "number", min: 0, max: 20 }
  ],
  run: (args: Ranson48hInputs) => {
    const v = calc_ranson_48h(args);
    return { id: "ranson_48h", label: "Ranson (48h)", value: v, unit: "criteria", precision: 0, notes: [] };
  },
};

export default def;
