
import { runSimplifiedGeneva } from "../lib/medical/engine/calculators/pe_geneva";

test("Simplified Geneva", ()=>{
  const out = runSimplifiedGeneva({ age_gt65:true, prior_dvt_pe:false, surgery_or_fracture_1m:false, active_malignancy:false, unilateral_leg_pain:true, hemoptysis:false, hr_bpm:100, pain_on_deep_vein_palpation_unilateral_edema:true })!;
  expect(out.simplified_geneva).toBeGreaterThanOrEqual(3);
  expect(out.band).toBe("high");
});
