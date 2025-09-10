
/**
 * Oxygenation helpers: S/F ratio, OI and OSI, age-adjusted A–a gradient.
 */
export type RespInputs = {
  pao2_mmHg?: number | null;
  spo2_percent?: number | null;
  fio2_fraction: number;           // 0–1
  map_cmH2O?: number | null;       // mean airway pressure for OI/OSI
  paco2_mmHg?: number | null;      // for A–a gradient
  baro_mmHg?: number | null;       // default 760
};

export function calcSF(i: RespInputs) {
  const pao2 = typeof i.pao2_mmHg === "number" ? i.pao2_mmHg : null;
  const spo2 = typeof i.spo2_percent === "number" ? i.spo2_percent : null;
  const fi = i.fio2_fraction;
  const s_f = spo2 != null ? (spo2/fi) : null;
  const p_f = pao2 != null ? (pao2/fi) : null;
  return { P_F_ratio: p_f ?? null, S_F_ratio: s_f ?? null };
}

export function calcOI(i: RespInputs) {
  const pao2 = i.pao2_mmHg;
  const map = i.map_cmH2O;
  if (typeof pao2 !== "number" || pao2 <= 0 || typeof map !== "number" || map <= 0) return { OI: null, OSI: null };
  const OI = (i.fio2_fraction * map * 100) / pao2;
  const spo2 = i.spo2_percent;
  const OSI = (typeof spo2 === "number" && spo2 > 0) ? (i.fio2_fraction * map * 100) / spo2 : null;
  return { OI, OSI };
}

export function calcAA(i: { fio2_fraction: number; paco2_mmHg: number; pao2_mmHg: number; age_years: number; baro_mmHg?: number; }) {
  const Patm = i.baro_mmHg ?? 760;
  const PH2O = 47;
  const R = 0.8;
  const PAO2 = i.fio2_fraction * (Patm - PH2O) - (i.paco2_mmHg / R);
  const AA = PAO2 - i.pao2_mmHg;
  const normal_upper = i.age_years/4 + 4;
  const elevated = AA > normal_upper;
  return { A_A_gradient_mmHg: AA, age_adjusted_upper_mmHg: normal_upper, above_expected: elevated };
}
