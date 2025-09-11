// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

export type FIB4Inputs = { age_years: number; ast_u_l: number; alt_u_l: number; platelets_10e9_l: number };

export function calc_fib4({ age_years, ast_u_l, alt_u_l, platelets_10e9_l }: FIB4Inputs): number {
  if (alt_u_l <= 0 || platelets_10e9_l <= 0) return NaN;
  return (age_years * ast_u_l) / (platelets_10e9_l * Math.sqrt(alt_u_l));
}

const def = {
  id: "fib4",
  label: "FIB-4 (liver fibrosis)",
  inputs: [
    { id: "age_years", label: "Age (years)", type: "number", min: 0, max: 120 },
    { id: "ast_u_l", label: "AST (U/L)", type: "number", min: 0 },
    { id: "alt_u_l", label: "ALT (U/L)", type: "number", min: 1 },
    { id: "platelets_10e9_l", label: "Platelets (×10⁹/L)", type: "number", min: 1 }
  ],
  run: (args: FIB4Inputs) => {
    const v = calc_fib4(args);
    return { id: "fib4", label: "FIB-4", value: v, unit: "", precision: 2, notes: [] };
  },
};

export default def;
