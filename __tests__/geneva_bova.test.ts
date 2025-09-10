import { runRevisedGeneva, runBOVA } from "../lib/medical/engine/calculators/pe_vte_tools";

test("Revised Geneva basic", () => {
  const out = runRevisedGeneva({ age_ge_65: true, previous_dvt_pe: false, surgery_fracture_1mo: false, active_malignancy: false, unilateral_lower_limb_pain: true, hemoptysis: false, hr_bpm: 98, pain_on_palpation_and_unilateral_edema: false });
  expect(out.score).toBeGreaterThan(0);
});

test("BOVA basic", () => {
  const out = runBOVA({ sbp_mmHg: 95, hr_bpm: 120, troponin_elevated: true, rv_dysfunction: true });
  expect(out.score).toBeGreaterThanOrEqual(0);
});
