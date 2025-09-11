export type APRIInputs = { ast_u_l: number; ast_uln_u_l: number; platelets_10e9_l: number };

export function calc_apri({ ast_u_l, ast_uln_u_l, platelets_10e9_l }: APRIInputs): number {
  if (ast_uln_u_l <= 0 || platelets_10e9_l <= 0) return NaN;
  return ((ast_u_l / ast_uln_u_l) * 100) / platelets_10e9_l;
}

const def = {
  id: "apri",
  label: "APRI (AST to Platelet Ratio Index)",
  inputs: [
    { id: "ast_u_l", label: "AST (U/L)", type: "number", min: 0 },
    { id: "ast_uln_u_l", label: "AST ULN (U/L)", type: "number", min: 1 },
    { id: "platelets_10e9_l", label: "Platelets (×10⁹/L)", type: "number", min: 1 }
  ],
  run: (args: APRIInputs) => {
    const v = calc_apri(args);
    return { id: "apri", label: "APRI", value: v, unit: "", precision: 2, notes: [] };
  },
};

export default def;
