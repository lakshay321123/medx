import { register } from "../registry";

export type KDIGOInputs = {
  creat_mg_dL_current: number;
  creat_mg_dL_baseline: number;
  creat_rise_mg_dL_48h?: number;   // absolute delta within 48h
  urine_mL_kg_h_6h?: number;
  urine_mL_kg_h_12h?: number;
  urine_mL_kg_h_24h?: number;
  rrt_initiated?: boolean;
};

function safeRatio(numer?: number, denom?: number): number | null {
  if (
    numer == null ||
    denom == null ||
    !isFinite(numer) ||
    !isFinite(denom) ||
    denom <= 0
  ) {
    return null;
  }
  return numer / denom;
}

function ge(val: number | null | undefined, thr: number): boolean {
  return val != null && isFinite(val as number) && (val as number) >= thr;
}

export function runKDIGO(i: KDIGOInputs) {
  if (
    i == null ||
    i.creat_mg_dL_current == null ||
    i.creat_mg_dL_baseline == null ||
    !isFinite(i.creat_mg_dL_current) ||
    !isFinite(i.creat_mg_dL_baseline)
  ) {
    return null;
  }

  const ratioRaw = safeRatio(i.creat_mg_dL_current, i.creat_mg_dL_baseline);

  const delta48Raw =
    i.creat_rise_mg_dL_48h != null && isFinite(i.creat_rise_mg_dL_48h)
      ? i.creat_rise_mg_dL_48h
      : i.creat_mg_dL_current - i.creat_mg_dL_baseline;

  let stage = 0;

  if (i.rrt_initiated) {
    stage = 3;
  } else {
    if (ge(ratioRaw, 3) || (i.creat_mg_dL_current >= 4.0 && i.creat_mg_dL_baseline > 0)) {
      stage = 3;
    } else if (ge(ratioRaw, 2)) {
      stage = Math.max(stage, 2);
    } else if (ge(ratioRaw, 1.5) || ge(delta48Raw, 0.3)) {
      stage = Math.max(stage, 1);
    }
  }

  // Urine output criteria (use the most severe met)
  if (i.urine_mL_kg_h_24h != null && isFinite(i.urine_mL_kg_h_24h) && i.urine_mL_kg_h_24h < 0.3) {
    stage = Math.max(stage, 3);
  } else if (i.urine_mL_kg_h_12h != null && isFinite(i.urine_mL_kg_h_12h) && i.urine_mL_kg_h_12h < 0.5) {
    stage = Math.max(stage, 2);
  } else if (i.urine_mL_kg_h_6h != null && isFinite(i.urine_mL_kg_h_6h) && i.urine_mL_kg_h_6h < 0.5) {
    stage = Math.max(stage, 1);
  }

  const ratio = ratioRaw != null && isFinite(ratioRaw) ? Number(ratioRaw.toFixed(2)) : null;
  const delta48 = delta48Raw != null && isFinite(delta48Raw) ? Number(delta48Raw.toFixed(2)) : null;

  return { KDIGO_stage: stage, ratio, delta48 };
}

register({
  id: "kdigo_aki",
  label: "AKI staging (KDIGO)",
  inputs: [
    { key: "creat_mg_dL_current", required: true },
    { key: "creat_mg_dL_baseline", required: true },
    { key: "creat_rise_mg_dL_48h" },
    { key: "urine_mL_kg_h_6h" },
    { key: "urine_mL_kg_h_12h" },
    { key: "urine_mL_kg_h_24h" },
    { key: "rrt_initiated" }
  ],
  run: runKDIGO as any
});
