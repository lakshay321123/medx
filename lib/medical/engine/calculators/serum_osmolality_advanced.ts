/**
 * Calculated Serum Osmolality (mOsm/kg):
 * = 2*Na + Glucose/18 + BUN/2.8 (+ Ethanol/3.7 if provided)
 */
export interface OsmInput {
  na: number; // mEq/L
  glucose_mg_dl: number;
  bun_mg_dl: number;
  ethanol_mg_dl?: number;
}
export interface OsmResult {
  calc_osm: number;
}
export function runSerumOsmolality(i: OsmInput): OsmResult {
  const base = 2 * i.na + i.glucose_mg_dl / 18 + i.bun_mg_dl / 2.8;
  const etoh = i.ethanol_mg_dl ? i.ethanol_mg_dl / 3.7 : 0;
  return { calc_osm: base + etoh };
}
