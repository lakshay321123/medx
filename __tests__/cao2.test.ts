import { runCaO2 } from "@/lib/medical/engine/calculators/cao2";

test("CaO2 content", () => {
  const r = runCaO2({ hb_g_dl:15, sao2_percent:98, pao2_mmHg:90 });
  expect(r.cao2_ml_dl).toBeGreaterThan(19);
});
