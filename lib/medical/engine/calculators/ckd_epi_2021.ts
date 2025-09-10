import { register } from "../registry";

/**
 * eGFR (CKD-EPI 2021, creatinine only)
 */
export function calc_ckd_epi_2021({
  creatinine_mg_dl, age_years, sex
}: {
  creatinine_mg_dl: number,
  age_years: number,
  sex: "male" | "female"
}) {
  const k = sex === "female" ? 0.7 : 0.9;
  const a = sex === "female" ? -0.241 : -0.302;
  const scr_k = creatinine_mg_dl / k;
  const term1 = Math.pow(Math.min(scr_k, 1), a);
  const term2 = Math.pow(Math.max(scr_k, 1), -1.2);
  const sexFactor = sex === "female" ? 1.012 : 1.0;
  const egfr = 142 * term1 * term2 * Math.pow(0.9938, age_years) * sexFactor;
  return egfr;
}

register({
  id: "ckd_epi_2021",
  label: "eGFR (CKD-EPI 2021)",
  tags: ["nephrology"],
  inputs: [
    { key: "creatinine_mg_dl", required: true },
    { key: "age_years", required: true },
    { key: "sex", required: true }
  ],
  run: ({
    creatinine_mg_dl,
    age_years,
    sex,
  }: {
    creatinine_mg_dl: number;
    age_years: number;
    sex: "male" | "female";
  }) => {
    const v = calc_ckd_epi_2021({ creatinine_mg_dl, age_years, sex });
    return { id: "ckd_epi_2021", label: "eGFR (CKD-EPI 2021)", value: v, unit: "mL/min/1.73m²", precision: 0, notes: [] };
  },
});
