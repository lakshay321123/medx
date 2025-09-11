// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.

export type NFSInputs = {
  age_years: number;
  bmi_kg_m2: number;
  ifg_or_diabetes: boolean;
  ast_u_l: number;
  alt_u_l: number;
  platelets_10e9_l: number;
  albumin_g_dl: number;
};

export function calc_nafld_fs({
  age_years, bmi_kg_m2, ifg_or_diabetes, ast_u_l, alt_u_l, platelets_10e9_l, albumin_g_dl
}: NFSInputs): number {
  const ast_alt_ratio = alt_u_l <= 0 ? NaN : (ast_u_l / alt_u_l);
  return -1.675 + 0.037*age_years + 0.094*bmi_kg_m2 + 1.13*(ifg_or_diabetes?1:0)
         + 0.99*ast_alt_ratio - 0.013*platelets_10e9_l - 0.66*albumin_g_dl;
}

const def = {
  id: "nafld_fibrosis_score",
  label: "NAFLD Fibrosis Score (NFS)",
  inputs: [
    { id: "age_years", label: "Age", type: "number", min: 0, max: 120 },
    { id: "bmi_kg_m2", label: "BMI (kg/m²)", type: "number", min: 0 },
    { id: "ifg_or_diabetes", label: "IFG/Diabetes", type: "boolean" },
    { id: "ast_u_l", label: "AST (U/L)", type: "number", min: 0 },
    { id: "alt_u_l", label: "ALT (U/L)", type: "number", min: 0 },
    { id: "platelets_10e9_l", label: "Platelets (×10^9/L)", type: "number", min: 1 },
    { id: "albumin_g_dl", label: "Albumin (g/dL)", type: "number", min: 0 }
  ],
  run: (args: NFSInputs) => {
    const v = calc_nafld_fs(args);
    return { id: "nafld_fibrosis_score", label: "NAFLD Fibrosis Score", value: v, unit: "index", precision: 2, notes: [] };
  },
};

export default def;
