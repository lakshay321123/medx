/**
 * Corrected Calcium
 * If albumin in g/dL: Ca_corr = Ca_meas + 0.8*(4 - Alb_g_dL)
 * If albumin in g/L:  Ca_corr = Ca_meas + 0.02*(40 - Alb_g_L)
 */
export interface CorrCalciumInput {
  ca_measured_mg_dl: number;
  albumin_g_dl?: number;
  albumin_g_l?: number;
}
export interface CorrCalciumResult {
  corrected_ca_mg_dl: number;
}
export function runCorrectedCalcium(i: CorrCalciumInput): CorrCalciumResult {
  if (i.albumin_g_dl != null) {
    return { corrected_ca_mg_dl: i.ca_measured_mg_dl + 0.8*(4 - i.albumin_g_dl) };
  } else if (i.albumin_g_l != null) {
    return { corrected_ca_mg_dl: i.ca_measured_mg_dl + 0.02*(40 - i.albumin_g_l) };
  }
  return { corrected_ca_mg_dl: i.ca_measured_mg_dl };
}
