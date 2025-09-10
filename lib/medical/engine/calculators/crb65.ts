/**
 * CRB-65 for community-acquired pneumonia (0–4)
 * Confusion, RR >= 30, SBP < 90 or DBP <= 60, Age >= 65
 */
export interface CRB65Input {
  confusion: boolean;
  rr_per_min: number;
  sbp_mmHg: number;
  dbp_mmHg: number;
  age: number;
}
export interface CRB65Result { score: number; }
export function runCRB65(i: CRB65Input): CRB65Result {
  let s = 0;
  if (i.confusion) s += 1;
  if (i.rr_per_min >= 30) s += 1;
  if (i.sbp_mmHg < 90 || i.dbp_mmHg <= 60) s += 1;
  if (i.age >= 65) s += 1;
  return { score: s };
}
