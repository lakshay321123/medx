import { runMELDNa } from "@/lib/medical/engine/calculators/meld_na";

test("MELD-Na bounds", () => {
  const r = runMELDNa({ creatinine_mg_dl:0.8, bilirubin_mg_dl:0.6, inr:0.9, sodium_meq_l:160 });
  expect(r.meld_na).toBeGreaterThanOrEqual(6);
  expect(r.meld_na).toBeLessThanOrEqual(40);
});
