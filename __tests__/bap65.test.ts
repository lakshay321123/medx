import { runBAP65 } from "../lib/medical/engine/calculators/bap65";
test("BAP-65 simple cases", ()=>{
  expect(runBAP65({ bun_mg_dL:10, altered_mental_status:false, pulse_bpm:90, age_years:60 }).points).toBe(0);
  expect(runBAP65({ bun_mg_dL:30, altered_mental_status:true, pulse_bpm:120, age_years:70 }).points).toBe(4);
  expect(runBAP65({ bun_mg_dL:30, pulse_bpm:108, age_years:64 }).points).toBe(1);
});
