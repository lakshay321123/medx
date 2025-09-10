/**
 * Arterial oxygen content (CaO2, mL O2/dL):
 * CaO2 = 1.34 * Hb * SaO2 + 0.0031 * PaO2
 * Provide SaO2 as percent (0–100) or fraction (0–1) via 'sao2_fraction' or 'sao2_percent'.
 */
export interface CaO2Input {
  hb_g_dl: number;
  sao2_fraction?: number;
  sao2_percent?: number;
  pao2_mmHg: number;
}
export interface CaO2Result { sao2_used_fraction: number; cao2_ml_dl: number; }
export function runCaO2(i: CaO2Input): CaO2Result {
  const s = i.sao2_fraction != null ? i.sao2_fraction : ((i.sao2_percent ?? 0) / 100);
  const cao2 = 1.34 * i.hb_g_dl * s + 0.0031 * i.pao2_mmHg;
  return { sao2_used_fraction: s, cao2_ml_dl: cao2 };
}
