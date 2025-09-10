import { register } from "../registry";

export interface CKDEPI2021CrInput {
  sex: "male"|"female";
  age: number;
  scr_mg_dl: number;
}
export function runEGFR_CKDEPI2021_CR(i: CKDEPI2021CrInput) {
  const kappa = i.sex === "female" ? 0.7 : 0.9;
  const alpha = i.sex === "female" ? -0.241 : -0.302;
  const minScrK = Math.min(i.scr_mg_dl / kappa, 1);
  const maxScrK = Math.max(i.scr_mg_dl / kappa, 1);
  const e = 142 * (minScrK ** alpha) * (maxScrK ** -1.200) * (0.9938 ** i.age) * (i.sex === "female" ? 1.012 : 1);
  return { egfr_ml_min_1_73m2: Math.round(e) };
}

register({
  id: "egfr_ckdepi_2021_cr",
  label: "eGFR (CKD-EPI 2021, Cr)",
  inputs: [
    { key: "sex", required: true },
    { key: "age", required: true },
    { key: "scr_mg_dl", required: true },
  ],
  run: (ctx) => {
    const r = runEGFR_CKDEPI2021_CR(ctx as any);
    return { id: "egfr_ckdepi_2021_cr", label: "eGFR CKD-EPI 2021 (Cr)", value: r.egfr_ml_min_1_73m2, unit: "mL/min/1.73m²", precision: 0 };
  },
});
