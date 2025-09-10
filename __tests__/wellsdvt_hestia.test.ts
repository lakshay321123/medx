
import { runWellsDVT, runHestia } from "../lib/medical/engine/calculators/pe_vte_tools";

test("Wells DVT bands", () => {
  const out = runWellsDVT({
    active_cancer: true,
    paralysis_paresis_or_cast: false,
    recently_bedridden_3d_or_surgery_12w: true,
    localized_tenderness: true,
    entire_leg_swollen: false,
    calf_swelling_gt_3cm: true,
    pitting_edema_confined: true,
    collateral_superficial_veins: false,
    alternative_diagnosis_as_likely: false
  });
  expect(["low","moderate","high"]).toContain(out.band);
});

test("Hestia gate", () => {
  expect(runHestia({ any_criteria_true: false }).eligible_for_outpatient).toBe(true);
  expect(runHestia({ any_criteria_true: true }).eligible_for_outpatient).toBe(false);
});
