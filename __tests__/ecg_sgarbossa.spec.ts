
import { runSgarbossa, runModifiedSgarbossa } from "../lib/medical/engine/calculators/ecg_sgarbossa";

test("Sgarbossa classic", ()=>{
  const out = runSgarbossa({ concordant_ste_mm_ge1:true, concordant_std_v1_v3_mm_ge1:false, discordant_ste_mm_ge5:false })!;
  expect(out.positive).toBe(true);
});

test("Modified Sgarbossa", ()=>{
  const out = runModifiedSgarbossa({ lead_st_mm:3, lead_s_wave_mm:10 })!;
  expect(out.positive).toBe(false);
});
