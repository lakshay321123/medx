
import { runAcetaminophenNomogramFlag, runToxicAlcoholSupport, runLactateGap } from "../lib/medical/engine/calculators/tox_screens";

test("Acetaminophen line (approx)", () => {
  const out = runAcetaminophenNomogramFlag({ time_hr_since_ingest:8, level_ug_mL:120 })!;
  expect(out.above_line).toBe(true); // threshold ~100 at 8h
});

test("Toxic alcohol support & lactate gap", () => {
  expect(runToxicAlcoholSupport({ osm_gap_mOsm_kg:15, anion_gap_mEq_L:18, pH:7.2 })!.supportive_flag).toBe(true);
  expect(runLactateGap({ arterial_mmol_L:6.0, venous_mmol_L:3.5 })!.lactate_gap_mmol_L).toBeCloseTo(2.5,1);
});
