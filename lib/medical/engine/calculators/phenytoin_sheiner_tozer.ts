/**
 * Corrected total phenytoin (ug/mL) using Sheiner-Tozer:
 * Normal renal: Ccorr = Cmeas / (0.2*Albumin + 0.1)
 * ESRD:         Ccorr = Cmeas / (0.1*Albumin + 0.1)
 */
export interface PhenytoinInput {
  measured_total_ug_ml: number;
  albumin_g_dl: number;
  esrd?: boolean;
}
export interface PhenytoinResult { corrected_total_ug_ml: number; }
export function runPhenytoinSheinerTozer(i: PhenytoinInput): PhenytoinResult {
  const denom = (i.esrd ? 0.1 : 0.2) * i.albumin_g_dl + 0.1;
  return { corrected_total_ug_ml: i.measured_total_ug_ml / denom };
}
