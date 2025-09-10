
import { runSerumOsmCalc, runEffectiveOsm, runOsmolarGap } from "../lib/medical/engine/calculators/osmolality";

test("Osm calculations", () => {
  const serum = runSerumOsmCalc({ Na:140, glucose_mg_dL:180, BUN_mg_dL:14 })!;
  expect(serum.serum_osm_mOsm_kg).toBeGreaterThan(280);
  const eff = runEffectiveOsm({ Na:140, glucose_mg_dL:180 })!;
  expect(eff.effective_osm_mOsm_kg).toBeGreaterThan(280);
  const gap = runOsmolarGap({ measured_osm_mOsm_kg:310, serum_osm_mOsm_kg:serum.serum_osm_mOsm_kg })!;
  expect(gap.osmolar_gap_mOsm_kg).toBeCloseTo(310 - serum.serum_osm_mOsm_kg, 1);
});
