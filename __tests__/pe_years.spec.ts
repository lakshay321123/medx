
import { runYEARS } from "../lib/medical/engine/calculators/pe_years";

test("YEARS thresholds", ()=>{
  const out0 = runYEARS({ clinical_signs_dvt:false, hemoptysis:false, pe_most_likely:false, d_dimer_ng_mL:800 })!;
  expect(out0.ruled_out).toBe(true);
  const out1 = runYEARS({ clinical_signs_dvt:true, hemoptysis:false, pe_most_likely:false, d_dimer_ng_mL:600 })!;
  expect(out1.d_dimer_threshold_ng_mL).toBe(500);
  expect(out1.ruled_out).toBe(false);
});
