/**
 * CRB-65 severity score for community-acquired pneumonia (0–4)
 * C: new confusion (AMT ≤ 8)          → 1
 * R: RR ≥ 30 / min                     → 1
 * B: SBP < 90 mmHg or DBP ≤ 60 mmHg    → 1
 * 65: Age ≥ 65                          → 1
 */
export interface CRB65Input {
  confusion: boolean;
  rr_per_min: number;
  sbp_mmHg: number;
  dbp_mmHg: number;
  age_years: number;
}
export interface CRB65Result {
  score: number;
  band: "low" | "moderate" | "high";
}

export function runCRB65(i: CRB65Input): CRB65Result {
  let s = 0;
  if (i.confusion) s += 1;
  if (i.rr_per_min >= 30) s += 1;
  if (i.sbp_mmHg < 90 || i.dbp_mmHg <= 60) s += 1;
  if (i.age_years >= 65) s += 1;

  let band: CRB65Result["band"] = "low";
  if (s >= 3) band = "high";
  else if (s === 2) band = "moderate";
  return { score: s, band };
}
