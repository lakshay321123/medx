import { round, toFraction } from "./utils";

export interface SFInput {
  spo2_frac: number; // 0-1 or % accepted (handled upstream)
  fio2_frac: number; // 0-1 or %
}
export function runSF(i: SFInput) {
  const s = toFraction(i.spo2_frac);
  const f = toFraction(i.fio2_frac);
  const ratio = f > 0 ? s / f : NaN;
  return { name: "S/F ratio", ratio: round(ratio, 2) };
}

export interface AAGradientInput {
  fio2_frac: number; // 0-1 or % accepted
  pao2_mmHg: number;
  paco2_mmHg: number;
  barometric_mmHg?: number; // default sea level 760
  ph2o_mmHg?: number; // 47
  rq?: number; // 0.8
  age_years?: number;
}
export function runAAGradient(i: AAGradientInput) {
  const FiO2 = toFraction(i.fio2_frac);
  const PB = i.barometric_mmHg ?? 760;
  const PH2O = i.ph2o_mmHg ?? 47;
  const RQ = i.rq ?? 0.8;
  const PAO2 = FiO2 * (PB - PH2O) - (i.paco2_mmHg / RQ);
  const AAg = PAO2 - i.pao2_mmHg;
  const ageNorm = i.age_years !== undefined ? (i.age_years / 4) + 4 : undefined;
  const elevated = ageNorm !== undefined ? AAg > ageNorm : undefined;
  return { name: "A–a gradient", PAO2: round(PAO2, 1), AAg: round(AAg, 1), age_adjusted_upper_normal: ageNorm !== undefined ? round(ageNorm, 1) : undefined, elevated };
}
