import { register } from "../registry";

/**
 * Corrected Na for Hyperglycemia (Katz)
 * corrected_Na = measured_Na + factor * ((glucose - 100)/100), factor default 1.6
 */
export function calc_sodium_correction_hyperglycemia({
  measured_na_mmol_l, glucose_mg_dl, factor_per_100
}: {
  measured_na_mmol_l: number,
  glucose_mg_dl: number,
  factor_per_100?: number
}) {
  const factor = factor_per_100 ?? 1.6;
  const corrected = measured_na_mmol_l + factor * ((glucose_mg_dl - 100) / 100);
  return { corrected, factor };
}

register({
  id: "sodium_correction_hyperglycemia",
  label: "Corrected Sodium (Hyperglycemia)",
  tags: ["endocrine", "electrolytes"],
  inputs: [
    { key: "measured_na_mmol_l", required: true },
    { key: "glucose_mg_dl", required: true },
    { key: "factor_per_100" }
  ],
  run: ({
    measured_na_mmol_l, glucose_mg_dl, factor_per_100
  }: {
    measured_na_mmol_l: number;
    glucose_mg_dl: number;
    factor_per_100?: number;
  }) => {
    const r = calc_sodium_correction_hyperglycemia({ measured_na_mmol_l, glucose_mg_dl, factor_per_100 });
    const notes = [`factor per 100 mg/dL = ${r.factor}`];
    return { id: "sodium_correction_hyperglycemia", label: "Corrected Sodium (Hyperglycemia)", value: r.corrected, unit: "mmol/L", precision: 1, notes, extra: r };
  },
});
