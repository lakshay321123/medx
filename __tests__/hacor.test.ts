import { runHACOR } from "../lib/medical/engine/calculators/hacor";
test("HACOR bins add up", ()=>{
  const out = runHACOR({ heart_rate_bpm:130, ph:7.28, gcs:12, pao2_over_fio2:140, rr_bpm:38 });
  expect(out.points).toBe(1+3+5+6+2); // =17
});
