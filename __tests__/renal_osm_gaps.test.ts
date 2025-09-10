import { calcSerumOsm } from "../lib/medical/engine/calculators/osmolality";
import { urineAnionGap, urineOsmGap } from "../lib/medical/engine/calculators/renal_gaps";

test("Osmolality", () => {
  const out = calcSerumOsm({ na_mEq_L: 140, bun_mg_dL: 14, glucose_mg_dL: 100, ethanol_mg_dL: 0, measured_mOsm_kg: 290 });
  expect(out.calculated_mOsm_kg).toBeGreaterThan(0);
});

test("Urine gaps", () => {
  const a = urineAnionGap(40, 30, 60);
  const o = urineOsmGap({ measured_mOsm_kg: 500, uNa_mEq_L: 40, uK_mEq_L: 30, uUrea_mg_dL: 400, uGlucose_mg_dL: 0 });
  expect(a.urine_anion_gap_mEq_L).toBeDefined();
  expect(o.urine_osm_gap_mOsm_kg).toBeDefined();
});
