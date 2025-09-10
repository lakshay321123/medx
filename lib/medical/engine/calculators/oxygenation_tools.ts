// lib/medical/engine/calculators/oxygenation_tools.ts
// Oxygenation adjuncts: S/F ratio, OI (Oxygenation Index), OSI, and age-adjusted A–a gradient.
// Accepts fractions or percents where noted; guards against invalid inputs.

import { round, toFraction, toPercent, clamp } from "./utils";

/* -------------------------------------------------------------------------- */
/*                                   S / F                                    */
/* -------------------------------------------------------------------------- */

export interface SFInput {
  /** SpO₂ as fraction (0–1) or percent (0–100). */
  spo2_frac: number;
  /** FiO₂ as fraction (0–1) or percent (0–100). */
  fio2_frac: number;
}

/** Simple S/F ratio (SpO₂% / FiO₂fraction). Returns ratio in the usual 0–500-ish scale. */
export function runSF(i: SFInput) {
  const spo2 = toPercent(i.spo2_frac);   // 92 -> 92; 0.92 -> 92
  const fio2 = toFraction(i.fio2_frac);  // 40 -> 0.40; 0.40 -> 0.40
  const ratio = spo2 / Math.max(fio2, 1e-6); // avoid divide-by-zero
  // Common clinical anchors: S/F ≤ 315 ~ PF ≤ 300 (mild ARDS), ≤ 235 ~ PF ≤ 200 (moderate)
  let band: "normal_or_mild" | "moderate" | "severe";
  if (ratio <= 235) band = "moderate";
  else if (ratio <= 315) band = "normal_or_mild";
  else band = "normal_or_mild";
  return { ratio: round(ratio, 0), band };
}

/** Compatibility wrapper used by some tests calling `calcSF`. */
export function calcSF(args: {
  spo2_percent: number;              // SpO₂ in %
  fio2_fraction: number;             // FiO₂ 0–1
  pao2_mmHg?: number;                // optional, ignored here
  map_cmH2O?: number;                // optional, ignored here
  paco2_mmHg?: number;               // optional, ignored here
  baro_mmHg?: number;                // optional, ignored here
}) {
  return runSF({ spo2_frac: args.spo2_percent, fio2_frac: args.fio2_fraction });
}

/* -------------------------------------------------------------------------- */
/*                           Oxygenation Index (OI / OSI)                      */
/* -------------------------------------------------------------------------- */

export interface OIInput {
  fio2_frac: number;   // 0–1 or 0–100 accepted; we normalize
  map_cmH2O: number;   // mean airway pressure (vent) in cmH2O
  pao2_mmHg: number;   // arterial PaO2
}

/** OI = (FiO₂ * MAP * 100) / PaO₂ */
export function calcOI(i: OIInput) {
  const fio2 = toFraction(i.fio2_frac);
  const oi = (fio2 * i.map_cmH2O * 100) / Math.max(i.pao2_mmHg, 1e-6);
  // Usual pediatric bands: 4–8 mild, 8–16 moderate, >16 severe (context dependent)
  return { OI: round(oi, 1) };
}

export interface OSIInput {
  fio2_frac: number;   // 0–1 or 0–100
  map_cmH2O: number;   // cmH2O
  spo2_frac: number;   // 0–1 or 0–100
}

/** OSI = (FiO₂ * MAP * 100) / SpO₂% */
export function calcOSI(i: OSIInput) {
  const fio2 = toFraction(i.fio2_frac);
  const spo2Pct = Math.max(toPercent(i.spo2_frac), 1e-6);
  const osi = (fio2 * i.map_cmH2O * 100) / spo2Pct;
  return { OSI: round(osi, 2) };
}

/* -------------------------------------------------------------------------- */
/*                        Age-adjusted A–a Gradient (mmHg)                     */
/* -------------------------------------------------------------------------- */

export interface AaInput {
  pao2_mmHg: number;                 // arterial PaO₂
  paco2_mmHg: number;                // arterial PaCO₂
  fio2_frac: number;                 // FiO₂ 0–1 or 0–100
  baro_mmHg?: number;                // barometric pressure (default 760 mmHg)
  ph2o_mmHg?: number;                // water vapor pressure (default 47 mmHg at 37°C)
  R?: number;                        // respiratory quotient, default 0.8
  age_years?: number;                // for age-adjusted “normal” at FiO2 ~ 0.21
}

/**
 * A–a gradient using alveolar gas equation:
 *   PAO₂ = FiO₂*(PB − PH₂O) − PaCO₂/R
 *   A–a = PAO₂ − PaO₂
 * If FiO₂ ≈ 0.21, returns an age-adjusted “expected normal” (≈ age/4 + 4).
 */
export function calcAaGradient(i: AaInput) {
  const PB = i.baro_mmHg ?? 760;
  const PH2O = i.ph2o_mmHg ?? 47;
  const R = i.R ?? 0.8;
  const FiO2 = toFraction(i.fio2_frac);

  const PAO2 = (FiO2 * (PB - PH2O)) - (i.paco2_mmHg / Math.max(R, 1e-6));
  const grad = PAO2 - i.pao2_mmHg;

  // Age-adjusted "normal" only meaningful around room air
  let expected_normal: number | null = null;
  if (FiO2 >= 0.19 && FiO2 <= 0.23 && typeof i.age_years === "number") {
    expected_normal = (i.age_years / 4) + 4; // classic bedside rule of thumb
  }
  return {
    PAO2_mmHg: round(PAO2, 1),
    A_a_gradient_mmHg: round(grad, 1),
    expected_normal_mmHg: expected_normal != null ? round(expected_normal, 1) : null,
  };
}

/* -------------------------------------------------------------------------- */
/*                                     End                                    */
/* -------------------------------------------------------------------------- */
