import { round } from "./utils";

export interface OsmInput {
  na_mEq_L: number;
  bun_mg_dL: number;
  glucose_mg_dL: number;
  ethanol_mg_dL?: number; // optional
  eg_mg_dL?: number;      // ethylene glycol (if available)
  methanol_mg_dL?: number;
  isopropanol_mg_dL?: number;
  measured_mOsm_kg?: number;
}

export function calcSerumOsm(i: OsmInput) {
  const base = 2 * i.na_mEq_L + i.bun_mg_dL / 2.8 + i.glucose_mg_dL / 18;
  const ethanol = (i.ethanol_mg_dL ?? 0) / 3.7;
  // Optional extensions—using approximate divisors for contribution
  const eg = i.eg_mg_dL ? (i.eg_mg_dL / 6.2) : 0;
  const meoh = i.methanol_mg_dL ? (i.methanol_mg_dL / 3.2) : 0;
  const iso = i.isopropanol_mg_dL ? (i.isopropanol_mg_dL / 5.9) : 0;
  const calc = base + ethanol + eg + meoh + iso;
  const gap = i.measured_mOsm_kg !== undefined ? i.measured_mOsm_kg - calc : undefined;
  return { calculated_mOsm_kg: round(calc, 1), osmolal_gap_mOsm_kg: gap !== undefined ? round(gap, 1) : undefined };
}
