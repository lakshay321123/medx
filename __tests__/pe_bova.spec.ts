
import { runBOVA } from "../lib/medical/engine/calculators/pe_bova";

test("BOVA", ()=>{
  const out = runBOVA({ sbp_mmHg:95, hr_bpm:120, rv_dysfunction:true, elevated_troponin:false })!;
  expect(out.BOVA_points).toBeGreaterThanOrEqual(4);
  expect(out.stage).toBeGreaterThanOrEqual(2);
});
