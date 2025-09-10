import { runCorrectedNa } from "@/lib/medical/engine/calculators/corrected_sodium_hyperglycemia";
import { runCalculatedOsm } from "@/lib/medical/engine/calculators/osmolality_and_gap";
import { runCorrectedCa } from "@/lib/medical/engine/calculators/calcium_corrected_albumin";
import { runHHS } from "@/lib/medical/engine/calculators/hhs_flags";

test("Corrected sodium for hyperglycemia", () => {
  const r = runCorrectedNa({ Na_meq_l: 130, glucose_mg_dl: 500 });
  expect(r.corrected_Na_meq_l).toBeCloseTo(136.4, 1);
});

test("Calculated osmolality and gap", () => {
  const r = runCalculatedOsm({ Na_meq_l: 140, glucose_mg_dl: 90, bun_mg_dl: 14 });
  expect(r.calculated_mOsm_kg).toBeCloseTo(290.0, 1);
});

test("Corrected calcium (albumin)", () => {
  const r = runCorrectedCa({ calcium_mg_dl: 8.0, albumin_g_dl: 2.5 });
  expect(r.corrected_calcium_mg_dl).toBeCloseTo(9.2, 2);
});

test("HHS flags", () => {
  const r = runHHS({ Na_meq_l: 150, glucose_mg_dl: 800, weight_kg: 80, sex: "male", age: 65, ketones_present: false, bicarb_mEq_L: 22 });
  expect(r.effective_osm_mOsm_kg).toBeGreaterThan(320);
  expect(r.hhs_likely).toBe(true);
  expect(r.water_deficit_l).toBeDefined();
});
