
import { runHEART } from "../lib/medical/engine/calculators/acs_heart";

test("HEART basic", ()=>{
  const out = runHEART({ history_level:2, ecg_level:2, age_years:70, risk_factors_count:3, troponin_level:2 })!;
  expect(out.HEART).toBeGreaterThanOrEqual(7);
  expect(out.risk_band).toContain("high");
});
