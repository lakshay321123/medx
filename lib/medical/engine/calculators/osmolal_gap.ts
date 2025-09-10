/**
 * Osmolal Gap:
 * gap = measured_osm - calculated_osm
 */
export interface OsmGapInput {
  measured_osm: number;
  calculated_osm: number;
}
export interface OsmGapResult {
  gap: number;
}
export function runOsmolalGap(i: OsmGapInput): OsmGapResult {
  return { gap: i.measured_osm - i.calculated_osm };
}
