import { runGAP } from "../lib/medical/engine/calculators/gap_ipf";
test("GAP staging", ()=>{
  // Male 68y, FVC 60, DLCO 30 -> 1+2+1+2 = 6 => Stage III
  const out = runGAP({ male:true, age_years:68, fvc_pct_pred:60, dlco_pct_pred:30 });
  expect(out.points).toBe(6);
  expect(out.stage).toBe("III");
});
