// lib/medical/engine/calculators/osmolality.ts
import { round, num } from "./utils";

export interface OsmInput {
  na_mEq_L: number;
  glu_mg_dL?: number | null;
  bun_mg_dL?: number | null;
  ethanol_mg_dL?: number | null;
  methanol_mg_dL?: number | null;
  ethylene_glycol_mg_dL?: number | null;
  isopropanol_mg_dL?: number | null;
  measured_osm_mOsm_kg?: number | null;
}

const safe = (x: any) => (typeof x === "number" && Number.isFinite(x) ? x : 0);

/** Traditional calculated serum osmolality plus optional alcohol contributions. */
export function calcOsm(i: OsmInput) {
  const na = i.na_mEq_L;
  const glu = safe(i.glu_mg_dL);
  const bun = safe(i.bun_mg_dL);
  const base = (2 * na) + (glu / 18) + (bun / 2.8);

  // Optional alcohol contributions (mg/dL → mOsm/kg approx factors)
  const ethanol = safe(i.ethanol_mg_dL) / 3.7;
  const methanol = safe(i.methanol_mg_dL) / 3.2;
  const eg = safe(i.ethylene_glycol_mg_dL) / 6.2;
  const iso = safe(i.isopropanol_mg_dL) / 6.0;

  const calculated = base + ethanol + methanol + eg + iso;
  const effective = (2 * na) + (glu / 18);
  const gap = (typeof i.measured_osm_mOsm_kg === "number" && Number.isFinite(i.measured_osm_mOsm_kg))
    ? i.measured_osm_mOsm_kg - calculated
    : null;

  return {
    osmolality_calc_mOsm_kg: round(calculated, 1),
    osmolality_effective_mOsm_kg: round(effective, 1),
    osmolal_gap_mOsm_kg: gap == null ? null : round(gap, 1),
  };
}
