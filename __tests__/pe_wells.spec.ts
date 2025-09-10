
import { runWellsPE, runWellsDVT } from "../lib/medical/engine/calculators/pe_wells";

test("Wells PE", ()=>{
  const out = runWellsPE({ signs_dvt:true, alt_dx_less_likely:true, hr_gt100:true, immob_surg_4w:false, prev_dvt_pe:false, hemoptysis:false, malignancy:false })!;
  expect(out.Wells_PE).toBeGreaterThan(4);
});

test("Wells DVT", ()=>{
  const out = runWellsDVT({ active_cancer:false, paralysis_recent_immob:false, bedridden_3d_major_surg_12w:false, localized_tenderness:true, leg_swelling:true, calf_swelling_ge3cm:true, pitting_edema_symptomatic_leg:false, collateral_nonvaricose_veins:false, alt_dx_at_least_likely:false })!;
  expect(out.Wells_DVT).toBeGreaterThanOrEqual(3);
});
