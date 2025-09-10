import { calcOsm } from "../lib/medical/engine/calculators/osmolality";
import { urineAnionGap, urineOsmGap, FENa, FEUrea } from "../lib/medical/engine/calculators/renal_gaps";

test("Calculated osmolality & gap", () => {
  const out = calcOsm({ na_mEq_L: 140, glu_mg_dL: 100, bun_mg_dL: 14, measured_osm_mOsm_kg: 295 });
  expect(out.osmolality_calc_mOsm_kg).toBeCloseTo(2*140 + 100/18 + 14/2.8, 1);
  expect(out.osmolal_gap_mOsm_kg).toBeCloseTo(295 - out.osmolality_calc_mOsm_kg, 1);
});

test("Urine anion gap & osm gap", () => {
  const uag = urineAnionGap(40, 30, 60);
  expect(uag.urine_anion_gap_mEq_L).toBe(10);
  const uog = urineOsmGap({ u_osm_measured_mOsm_kg: 600, una_mEq_L: 40, uk_mEq_L: 30, urea_mg_dL: 300, glucose_mg_dL: 90 });
  // calc = 2*(70) + 300/2.8 + 90/18 = 140 + 107.1 + 5 = 252.1 ; gap ≈ 347.9
  expect(uog.urine_osm_calc_mOsm_kg).toBeCloseTo(252.1, 1);
  expect(uog.urine_osm_gap_mOsm_kg).toBeCloseTo(347.9, 1);
});

test("FENa & FEUrea", () => {
  const feNa = FENa(100, 140, 100, 1.0);
  expect(feNa.FE_percent).toBeCloseTo((100*1)/(140*100)*100, 5);
  const feU = FEUrea(400, 20, 100, 1.0); // 400 mg/dL urine urea, 20 mg/dL BUN
  expect(feU.FE_percent).toBeCloseTo((400*1)/(20*100)*100, 5);
});
