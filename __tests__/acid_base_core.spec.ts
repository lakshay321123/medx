
import { runAnionGap, runAnionGapAlbuminCorrected, runWintersExpectedPaCO2, runDeltaGap, runDeltaRatio, runBicarbonateDeficit } from "../lib/medical/engine/calculators/acid_base_core";

test("AG & corrected", () => {
  const ag = runAnionGap({ Na:140, Cl:100, HCO3:20 })!;
  expect(ag.ag).toBe(20);
  const agc = runAnionGapAlbuminCorrected({ AG:ag.ag, albumin_g_dL:2.0 })!;
  expect(agc.ag_corrected).toBeCloseTo(25, 0);
});

test("Winter's & delta", () => {
  const w = runWintersExpectedPaCO2({ HCO3:12 })!;
  expect(w.expected_PaCO2_mmHg).toBe(26);
  const dg = runDeltaGap({ AG:24, HCO3:12 })!;
  expect(dg.delta_gap).toBe(0);
  const dr = runDeltaRatio({ AG:24, HCO3:12 })!;
  expect(dr.delta_ratio).toBeCloseTo(1.0, 2);
});

test("Bicarb deficit", () => {
  const out = runBicarbonateDeficit({ weight_kg:70, HCO3:10, target_HCO3:24 })!;
  expect(out.bicarbonate_deficit_mEq).toBeGreaterThan(0);
});
