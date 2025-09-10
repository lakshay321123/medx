/**
 * Albumin-corrected anion gap (AGcorr) in mEq/L
 * If Na, Cl, HCO3 provided, compute AG = Na - (Cl + HCO3); else use provided AG
 * AGcorr = AG + 2.5*(4 - albumin_g_dl)
 */
export interface AGCorrInput {
  albumin_g_dl: number;
  na?: number;
  cl?: number;
  hco3?: number;
  ag?: number;
}
export interface AGCorrResult { ag: number; ag_corrected: number; }
export function runAnionGapCorrected(i: AGCorrInput): AGCorrResult {
  const ag = i.ag != null ? i.ag : ((i.na ?? 0) - ((i.cl ?? 0) + (i.hco3 ?? 0)));
  const corrected = ag + 2.5 * (4 - i.albumin_g_dl);
  return { ag, ag_corrected: corrected };
}
