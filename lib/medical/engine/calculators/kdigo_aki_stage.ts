import { register } from "../registry";

export interface KDIGOInput {
  baseline_scr_mg_dl: number;
  current_scr_mg_dl: number;
  rrt_initiated?: boolean;
}
export function runKDIGO_AKI(i: KDIGOInput) {
  const ratio = i.current_scr_mg_dl / i.baseline_scr_mg_dl;
  let stage: 0|1|2|3 = 0;
  if (i.rrt_initiated) stage = 3;
  else if (i.current_scr_mg_dl >= 4.0 && (i.current_scr_mg_dl - i.baseline_scr_mg_dl) >= 0.3) stage = 3;
  else if (ratio >= 3.0) stage = 3;
  else if (ratio >= 2.0) stage = 2;
  else if (ratio >= 1.5 || (i.current_scr_mg_dl - i.baseline_scr_mg_dl) >= 0.3) stage = 1;
  return { stage, ratio: Number(ratio.toFixed(2)) };
}

register({
  id: "kdigo_aki_stage",
  label: "KDIGO AKI stage (Cr-based)",
  inputs: [
    { key: "baseline_scr_mg_dl", required: true },
    { key: "current_scr_mg_dl", required: true },
    { key: "rrt_initiated" },
  ],
  run: (ctx: any) => {
    const r = runKDIGO_AKI(ctx as any);
    return { id: "kdigo_aki_stage", label: "KDIGO AKI stage", value: r.stage, unit: "", notes: [`ratio ${r.ratio}×`], precision: 0 };
  },
});
