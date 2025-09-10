import { register } from "../registry";

export interface FeUreaInput {
  urine_urea_mg_dl: number;
  plasma_bun_mg_dl: number;
  urine_cr_mg_dl: number;
  plasma_cr_mg_dl: number;
}
export function runFeUrea(i: FeUreaInput) {
  const feurea = (i.urine_urea_mg_dl * i.plasma_cr_mg_dl) / (i.plasma_bun_mg_dl * i.urine_cr_mg_dl) * 100;
  let band: "prerenal_suggested" | "intrinsic_possible" | "indeterminate" = "indeterminate";
  if (isFinite(feurea)) {
    if (feurea < 35) band = "prerenal_suggested";
    else if (feurea > 50) band = "intrinsic_possible";
  }
  return { feurea_pct: Number(feurea.toFixed(1)), band };
}

register({
  id: "feurea",
  label: "FeUrea (fractional excretion urea)",
  inputs: [
    { key: "urine_urea_mg_dl", required: true },
    { key: "plasma_bun_mg_dl", required: true },
    { key: "urine_cr_mg_dl", required: true },
    { key: "plasma_cr_mg_dl", required: true },
  ],
  run: (ctx) => {
    const r = runFeUrea(ctx as any);
    return { id: "feurea", label: "FeUrea", value: r.feurea_pct, unit: "%", notes: [r.band.replaceAll("_"," ")], precision: 1 };
  },
});
