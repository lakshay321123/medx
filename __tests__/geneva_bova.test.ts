import { runRevisedGeneva, runWellsDVT, runBOVA, runHestia } from "../lib/medical/engine/calculators/pe_vte_tools";

test("Revised Geneva low vs high", () => {
  const low = runRevisedGeneva({
    age_gt_65:false, previous_dvt_pe:false, surgery_fracture_within_1mo:false, active_malignancy:false,
    unilateral_lower_limb_pain:false, hemoptysis:false, heart_rate_bpm:60,
    pain_on_deep_venous_palpation_and_unilateral_edema:false
  });
  expect(low.risk_band).toBe("low");

  const high = runRevisedGeneva({
    age_gt_65:true, previous_dvt_pe:true, surgery_fracture_within_1mo:true, active_malignancy:true,
    unilateral_lower_limb_pain:true, hemoptysis:true, heart_rate_bpm:110,
    pain_on_deep_venous_palpation_and_unilateral_edema:true
  });
  expect(high.risk_band).toBe("high");
});

test("Wells DVT likely", () => {
  const w = runWellsDVT({
    active_cancer:true, paralysis_or_recent_immobilization:true, bedridden_3d_or_major_surgery_12w:true,
    localized_tenderness_deep_veins:true, entire_leg_swollen:true, calf_swelling_gt_3cm:true,
    pitting_edema_confined:true, collateral_superficial_veins:true, previous_dvt:true,
    alternative_dx_as_likely:false
  });
  expect(w.wells_dvt_points).toBe(9);
  expect(w.probability).toBe("likely");
});

test("BOVA staging", () => {
  const b = runBOVA({ sbp_mmHg: 95, heart_rate_bpm: 120, rv_dysfunction: true, troponin_elevated: true });
  expect(b.bova_points).toBe(8);
  expect(b.bova_stage).toBe(3);
});

test("Hestia eligibility", () => {
  const ok = runHestia({
    active_bleeding:false, hemodynamic_instability:false, need_for_thrombolysis_or_embolectomy:false,
    need_for_iv_pain_medication:false, creatinine_clearance_lt_30:false, severe_liver_impairment:false,
    platelet_lt_75k:false, pregnancy:false, social_issues_or_no_support:false, oxygen_sat_lt_90_on_room_air:false
  });
  expect(ok.outpatient_eligible).toBe(true);

  const notOk = runHestia({ active_bleeding:true, hemodynamic_instability:false, need_for_thrombolysis_or_embolectomy:false,
    need_for_iv_pain_medication:false, creatinine_clearance_lt_30:false, severe_liver_impairment:false,
    platelet_lt_75k:false, pregnancy:false, social_issues_or_no_support:false, oxygen_sat_lt_90_on_room_air:false });
  expect(notOk.outpatient_eligible).toBe(false);
});
