// lib/medical/engine/calculators/fib4.ts
export interface FIB4Input {
  age_years?: number | null;
  ast_u_l?: number | null;
  alt_u_l?: number | null;
  platelets_10e9_L?: number | null;
}
export interface FIB4Output { score: number; band: "low"|"indeterminate"|"high"; }

export function runFIB4(i: FIB4Input): FIB4Output {
  if (i.age_years == null || i.ast_u_l == null || i.alt_u_l == null || i.platelets_10e9_L == null) {
    return { score: NaN, band: "indeterminate" };
  }
  const score = (i.age_years * i.ast_u_l) / (i.platelets_10e9_L * Math.sqrt(i.alt_u_l));
  let band: "low"|"indeterminate"|"high" = "indeterminate";
  if (score < 1.3) band = "low";
  else if (score > 2.67) band = "high";
  return { score, band };
}
