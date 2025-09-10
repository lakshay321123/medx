import { register } from "../registry";

export interface EGFR_CrCysInput {
  sex: "male"|"female";
  age: number;
  scr_mg_dl: number;
  scys_mg_l: number;
}
export function runEGFR_CrCys(i: EGFR_CrCysInput) {
  const kappa = i.sex === "female" ? 0.7 : 0.9;
  const alpha = i.sex === "female" ? -0.248 : -0.207;
  const scr = i.scr_mg_dl;
  const scys = i.scys_mg_l;
  const termScrMin = Math.min(scr / kappa, 1) ** alpha;
  const termScrMax = Math.max(scr / kappa, 1) ** -0.601;
  const termCysMin = Math.min(scys / 0.8, 1) ** -0.375;
  const termCysMax = Math.max(scys / 0.8, 1) ** -0.711;
  const sexFactor = i.sex === "female" ? 0.969 : 1;
  const ageFactor = 0.995 ** i.age;
  const e = 135 * termScrMin * termScrMax * termCysMin * termCysMax * ageFactor * sexFactor;
  return { egfr_ml_min_1_73m2: Math.round(e) };
}

register({
  id: "egfr_ckdepi_cr_cys",
  label: "eGFR (CKD-EPI Cr+Cys)",
  inputs: [
    { key: "sex", required: true },
    { key: "age", required: true },
    { key: "scr_mg_dl", required: true },
    { key: "scys_mg_l", required: true },
  ],
  run: (ctx) => {
    const r = runEGFR_CrCys(ctx as any);
    return { id: "egfr_ckdepi_cr_cys", label: "eGFR CKD-EPI (Cr+Cys)", value: r.egfr_ml_min_1_73m2, unit: "mL/min/1.73m²", precision: 0 };
  },
});
