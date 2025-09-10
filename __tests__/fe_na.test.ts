import { runFeNa } from "@/lib/medical/engine/calculators/fe_na";

test("FeNa", () => {
  const r = runFeNa({ urine_na_mEq_L:40, plasma_na_mEq_L:140, urine_cr_mg_dl:100, plasma_cr_mg_dl:2 });
  // FeNa = (40*2)/(140*100)*100 = 800/14000*100 = 5.714...
  expect(r.fena_percent).toBeCloseTo(5.714, 3);
});
