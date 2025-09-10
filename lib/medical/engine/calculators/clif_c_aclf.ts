
/**
 * CLIF-C ACLF score (requires CLIF-C OF score, age, and WBC).
 * Formula: CLIF-C ACLF = 10 * (0.33 * CLIF-OF + 0.04 * age + 0.63 * ln(WBC) - 2)
 * WBC in 10^9/L (i.e., ×10^9 cells/L). 
 * 
 * References: Engelmann et al. 2018 (CCM) and EFCLIF calculators page.
 */
import { ln, num } from "./utils";

export type CLIFCInputs = {
  clif_of_score: number;   // integer 6–18 typically
  age_years: number;
  wbc_10e9_L: number;      // 10^9/L
};

export function runCLIFC_ACLF(i: CLIFCInputs) {
  const of = num(i.clif_of_score);
  const age = num(i.age_years);
  const wbc = Math.max(num(i.wbc_10e9_L), 0.1);
  const score = 10 * (0.33 * of + 0.04 * age + 0.63 * ln(wbc) - 2);
  const band = score >= 70 ? "very high" : score >= 60 ? "high" : score >= 50 ? "intermediate" : "lower";
  return { CLIF_C_ACLF: Math.round(score), risk_band: band };
}
