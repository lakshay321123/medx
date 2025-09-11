// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.

export type RansonInputs = {
  age_years: number;
  wbc_10e9_l: number;
  glucose_mg_dl: number;
  ast_u_l: number;
  ldh_u_l: number;
  hct_drop_percent: number;
  bun_increase_mg_dl: number;
  calcium_mg_dl: number;
  pao2_mm_hg: number;
  base_deficit_mEq_l: number;
  fluid_sequestration_l: number;
};

export function calc_ranson({
  age_years, wbc_10e9_l, glucose_mg_dl, ast_u_l, ldh_u_l,
  hct_drop_percent, bun_increase_mg_dl, calcium_mg_dl, pao2_mm_hg, base_deficit_mEq_l, fluid_sequestration_l
}: RansonInputs): number {
  let score = 0;
  if (age_years > 55) score++;
  if (wbc_10e9_l > 16) score++;
  if (glucose_mg_dl > 200) score++;
  if (ast_u_l > 250) score++;
  if (ldh_u_l > 350) score++;
  if (hct_drop_percent > 10) score++;
  if (bun_increase_mg_dl > 5) score++;
  if (calcium_mg_dl < 8) score++;
  if (pao2_mm_hg < 60) score++;
  if (base_deficit_mEq_l > 4) score++;
  if (fluid_sequestration_l > 6) score++;
  return score;
}

const def = {
  id: "ranson_criteria",
  label: "Ranson Criteria (Pancreatitis)",
  inputs: [
    { id: "age_years", label: "Age", type: "number", min: 0, max: 120 },
    { id: "wbc_10e9_l", label: "WBC (×10^9/L)", type: "number", min: 0 },
    { id: "glucose_mg_dl", label: "Glucose (mg/dL)", type: "number", min: 0 },
    { id: "ast_u_l", label: "AST (U/L)", type: "number", min: 0 },
    { id: "ldh_u_l", label: "LDH (U/L)", type: "number", min: 0 },
    { id: "hct_drop_percent", label: "Hct drop (%) in 48h", type: "number", min: 0 },
    { id: "bun_increase_mg_dl", label: "BUN increase (mg/dL)", type: "number", min: 0 },
    { id: "calcium_mg_dl", label: "Calcium (mg/dL)", type: "number", min: 0 },
    { id: "pao2_mm_hg", label: "PaO2 (mmHg)", type: "number", min: 0 },
    { id: "base_deficit_mEq_l", label: "Base deficit (mEq/L)", type: "number", min: -50, max: 50 },
    { id: "fluid_sequestration_l", label: "Fluid sequestration (L)", type: "number", min: 0 }
  ],
  run: (args: RansonInputs) => {
    const v = calc_ranson(args);
    return { id: "ranson_criteria", label: "Ranson Criteria", value: v, unit: "score", precision: 0, notes: [] };
  },
};

export default def;
