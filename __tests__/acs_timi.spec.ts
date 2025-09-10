
import { runTIMI_UA_NSTEMI, runTIMI_STEMI } from "../lib/medical/engine/calculators/acs_timi";

test("TIMI UA/NSTEMI", ()=>{
  const out = runTIMI_UA_NSTEMI({ age_years:68, risk_factors_count:3, known_cad_ge50pct:true, aspirin_7d:true, severe_angina_24h:true, st_deviation_mm_ge_0_5:true, positive_marker:true })!;
  expect(out.TIMI_UA_NSTEMI).toBeGreaterThanOrEqual(5);
});

test("TIMI STEMI simplified", ()=>{
  const out = runTIMI_STEMI({ age_ge75:false, age_65_74:true, risk_factors_ge3:true, sbp_lt100:true, hr_gt100:true, anterior_ste_or_lbbb:true, time_to_tx_gt4h:false, weight_lt67kg:false })!;
  expect(out.TIMI_STEMI).toBeGreaterThan(5);
});
