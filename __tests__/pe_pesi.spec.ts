
import { runPESI, runSPESI } from "../lib/medical/engine/calculators/pe_pesi";

test("PESI & sPESI", ()=>{
  const pesi = runPESI({ age_years:70, male:true, cancer:false, heart_failure:true, chronic_lung_disease:false, hr_bpm:120, sbp_mmHg:95, rr_bpm:30, temp_c:35.5, altered_mental_status:true, SaO2_pct:88 })!;
  expect(pesi.PESI).toBeGreaterThan(100);
  const spesi = runSPESI({ age_gt80:false, cancer:false, heart_failure_or_pulm_disease:true, hr_ge110:true, sbp_lt100:true, SaO2_lt90:true })!;
  expect(spesi.sPESI).toBeGreaterThanOrEqual(3);
});
