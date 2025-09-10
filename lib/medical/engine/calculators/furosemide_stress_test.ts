import { register } from "../registry";

/**
 * Furosemide Stress Test (FST):
 * Typical protocol: 1–1.5 mg/kg IV bolus (use 1 mg/kg if diuretic-naïve; 1.5 mg/kg if chronic loop exposure).
 * Measure 2-hour urine output:
 * - <200 mL in 2h → high risk of AKI progression / RRT need
 * - >=200 mL in 2h → lower risk
 */
export function computeFST(params: {
  weight_kg: number | null;
  dose_mg: number | null;
  chronic_loop_use: boolean | null;
  urine_2h_mL: number | null;
}) {
  const { weight_kg, dose_mg, chronic_loop_use, urine_2h_mL } = params;
  if (weight_kg == null || dose_mg == null || chronic_loop_use == null || urine_2h_mL == null) {
    return {
      result: null,
      band: "insufficient_inputs",
      notes: ["Need weight, dose, chronic loop use, 2h urine."],
    };
  }

  const suggestedDose = (chronic_loop_use ? 1.5 : 1.0) * weight_kg;
  const doseAdequate = dose_mg >= suggestedDose - 5 && dose_mg <= suggestedDose + 5; // ±5 mg window

  const band = urine_2h_mL < 200 ? "high_risk_progression" : "lower_risk";
  const notes = [
    `suggestedDose_mg≈${Math.round(suggestedDose)}`,
    `doseAdequate=${doseAdequate}`,
    `urine_2h=${urine_2h_mL}mL`,
  ];

  return { result: urine_2h_mL, band, notes };
}

register({
  id: "furosemide_stress_test",
  label: "Furosemide Stress Test",
  inputs: [
    { key: "weight_kg", required: true },
    { key: "dose_mg", required: true },
    { key: "chronic_loop_use", required: true },
    { key: "urine_2h_mL", required: true },
  ],
  run: computeFST,
});
