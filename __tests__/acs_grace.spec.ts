
import { runGRACE } from "../lib/medical/engine/calculators/acs_grace";

test("GRACE scaffold", ()=>{
  const out = runGRACE({ age_years:74, hr_bpm:110, sbp_mmHg:90, creat_mg_dL:1.8, killip_class:3, st_deviation:true, cardiac_arrest_at_admit:false, elevated_markers:true })!;
  expect(out.GRACE_surrogate).toBeGreaterThan(0);
  expect(out.risk_band).toBeDefined();
});
