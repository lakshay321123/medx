// lib/medical/engine/calculators/acetaminophen_nomogram.ts
import { round } from "./utils";

/** Returns whether the 4–24 h Rumack–Matthew 150-line is crossed by the given serum level. */
export function crosses150Line(conc_mcg_mL: number, hours_post_ingestion: number) {
  // Convert ug/mL → mg/L equivalence (1 ug/mL = 1 mg/L); we'll work in ug/mL.
  // 150-line model: C_t = 150 * exp(-k*(t-4)), with k ≈ 0.1733 h^-1 (half-life ~4 h).
  const t = Math.max(hours_post_ingestion, 0);
  const k = 0.1733;
  const threshold = (t < 4) ? 150 : 150 * Math.exp(-k * (t - 4));
  return { above_line: conc_mcg_mL >= threshold, threshold_ug_mL: round(threshold, 1) };
}
