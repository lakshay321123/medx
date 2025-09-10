import { register } from "../registry";

export interface FeNaInput {
  urine_na_meq_l: number;
  plasma_na_meq_l: number;
  urine_cr_mg_dl: number;
  plasma_cr_mg_dl: number;
}
export function runFeNa(i: FeNaInput) {
  const fena = (i.urine_na_meq_l * i.plasma_cr_mg_dl) / (i.plasma_na_meq_l * i.urine_cr_mg_dl) * 100;
  let band: "prerenal_suggested" | "intrinsic_possible" | "indeterminate" = "indeterminate";
  if (isFinite(fena)) {
    if (fena < 1) band = "prerenal_suggested";
    else if (fena > 2) band = "intrinsic_possible";
  }
  return { fena_pct: Number(fena.toFixed(2)), band };
}

register({
  id: "fena",
  label: "FeNa (fractional excretion Na)",
  inputs: [
    { key: "urine_na_meq_l", required: true },
    { key: "plasma_na_meq_l", required: true },
    { key: "urine_cr_mg_dl", required: true },
    { key: "plasma_cr_mg_dl", required: true },
  ],
  run: (ctx) => {
    const r = runFeNa(ctx as any);
    return { id: "fena", label: "FeNa", value: r.fena_pct, unit: "%", notes: [r.band.replaceAll("_"," ")], precision: 2 };
  },
});
