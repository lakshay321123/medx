import { runFeUrea } from "@/lib/medical/engine/calculators/fe_urea";

test("FeUrea", () => {
  const r = runFeUrea({ urine_urea_mg_dl:400, plasma_urea_mg_dl:40, urine_cr_mg_dl:100, plasma_cr_mg_dl:2 });
  // (400*2)/(40*100)*100 = 800/4000*100 = 20%
  expect(r.feu_percent).toBeCloseTo(20, 3);
});
