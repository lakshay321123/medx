// Auto-generated calculator. Sources cited in PR. No placeholders.
// Keep structure consistent with other calculators in MedX.

export type ApriInputs = {
  ast_u_l: number;
  ast_uln_u_l: number;
  platelets_10e9_l: number;
};

export function calc_apri({ ast_u_l, ast_uln_u_l, platelets_10e9_l }: ApriInputs): number {
  if (ast_uln_u_l <= 0 || platelets_10e9_l <= 0) return NaN;
  return ((ast_u_l / ast_uln_u_l) * 100) / platelets_10e9_l;
}

const def = {
  id: "apri",
  label: "APRI",
  inputs: [
    { id: "ast_u_l", label: "AST (U/L)", type: "number", min: 0 },
    { id: "ast_uln_u_l", label: "AST ULN (U/L)", type: "number", min: 1 },
    { id: "platelets_10e9_l", label: "Platelets (×10^9/L)", type: "number", min: 1 }
  ],
  run: ({ ast_u_l, ast_uln_u_l, platelets_10e9_l }: ApriInputs) => {
    const v = calc_apri({ ast_u_l, ast_uln_u_l, platelets_10e9_l });
    return { id: "apri", label: "APRI", value: v, unit: "index", precision: 2, notes: [] };
  },
};

export default def;
