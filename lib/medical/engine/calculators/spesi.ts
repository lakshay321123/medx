// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.

export type SPESIInputs = {
  age_years: number;
  cancer: boolean;
  chronic_cardiopulm: boolean;
  heart_rate_bpm: number;
  sbp_mm_hg: number;
  sao2_percent: number;
};

export function calc_spesi({ age_years, cancer, chronic_cardiopulm, heart_rate_bpm, sbp_mm_hg, sao2_percent }: SPESIInputs): number {
  let score = 0;
  if (age_years > 80) score++;
  if (cancer) score++;
  if (chronic_cardiopulm) score++;
  if (heart_rate_bpm >= 110) score++;
  if (sbp_mm_hg < 100) score++;
  if (sao2_percent < 90) score++;
  return score;
}

const def = {
  id: "spesi",
  label: "sPESI (PE)",
  inputs: [
    { id: "age_years", label: "Age", type: "number", min: 0, max: 120 },
    { id: "cancer", label: "Active cancer", type: "boolean" },
    { id: "chronic_cardiopulm", label: "Chronic cardiopulmonary disease", type: "boolean" },
    { id: "heart_rate_bpm", label: "Heart rate (bpm)", type: "number", min: 0 },
    { id: "sbp_mm_hg", label: "SBP (mmHg)", type: "number", min: 0 },
    { id: "sao2_percent", label: "SaO2 (%)", type: "number", min: 0, max: 100 }
  ],
  run: (args: SPESIInputs) => {
    const v = calc_spesi(args);
    const notes = [v === 0 ? "low 30-day risk" : "elevated risk"];
    return { id: "spesi", label: "sPESI", value: v, unit: "score", precision: 0, notes };
  },
};

export default def;
