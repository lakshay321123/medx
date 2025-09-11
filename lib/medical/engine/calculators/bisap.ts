// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.

export type BisapInputs = {
  bun_mg_dl: number;
  impaired_mental_status: boolean;
  sirs_count: number; // 0-4
  age_years: number;
  pleural_effusion: boolean;
};

export function calc_bisap({ bun_mg_dl, impaired_mental_status, sirs_count, age_years, pleural_effusion }: BisapInputs): number {
  let score = 0;
  if (bun_mg_dl > 25) score++;
  if (impaired_mental_status) score++;
  if (sirs_count >= 2) score++;
  if (age_years > 60) score++;
  if (pleural_effusion) score++;
  return score;
}

const def = {
  id: "bisap",
  label: "BISAP (Acute Pancreatitis)",
  inputs: [
    { id: "bun_mg_dl", label: "BUN (mg/dL)", type: "number", min: 0 },
    { id: "impaired_mental_status", label: "Impaired mental status", type: "boolean" },
    { id: "sirs_count", label: "SIRS count (0-4)", type: "number", min: 0, max: 4, step: 1 },
    { id: "age_years", label: "Age", type: "number", min: 0, max: 120 },
    { id: "pleural_effusion", label: "Pleural effusion", type: "boolean" }
  ],
  run: ({ bun_mg_dl, impaired_mental_status, sirs_count, age_years, pleural_effusion }: BisapInputs) => {
    const v = calc_bisap({ bun_mg_dl, impaired_mental_status, sirs_count, age_years, pleural_effusion });
    return { id: "bisap", label: "BISAP", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
