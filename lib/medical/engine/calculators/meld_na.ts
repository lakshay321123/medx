/**
 * MELD-Na (6–40)
 * Boundaries: creatinine, bilirubin, INR minimum 1.0; creatinine capped at 4.0
 * Sodium bounded 125–137
 * MELD = 0.957*ln(Cr) + 0.378*ln(Bili) + 1.120*ln(INR) + 0.643
 * MELD-Na = MELD + 1.32*(137-Na) - [0.033*MELD*(137-Na)]
 */
export interface MELDNaInput {
  creatinine_mg_dl: number;
  bilirubin_mg_dl: number;
  inr: number;
  sodium_meq_l: number;
}
export interface MELDNaResult { meld: number; meld_na: number; }
export function runMELDNa(i: MELDNaInput): MELDNaResult {
  const cr = Math.min(Math.max(i.creatinine_mg_dl, 1.0), 4.0);
  const bili = Math.max(i.bilirubin_mg_dl, 1.0);
  const inr = Math.max(i.inr, 1.0);
  const na = Math.min(Math.max(i.sodium_meq_l, 125), 137);

  const meld = 0.957*Math.log(cr) + 0.378*Math.log(bili) + 1.120*Math.log(inr) + 0.643;
  const adj = 1.32*(137 - na) - (0.033*meld*(137 - na));
  let meld_na = Math.round(meld + adj);
  meld_na = Math.max(6, Math.min(meld_na, 40));
  return { meld, meld_na };
}
