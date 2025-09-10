import { runCorrectedCalcium } from "@/lib/medical/engine/calculators/corrected_calcium";

test("Corrected calcium g/dL", () => {
  const r = runCorrectedCalcium({ ca_measured_mg_dl:8.0, albumin_g_dl:2.0 });
  expect(r.corrected_ca_mg_dl).toBeCloseTo(8.0 + 0.8*(4-2), 3);
});
