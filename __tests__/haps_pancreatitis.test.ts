import { runHAPS } from "@/lib/medical/engine/calculators/haps_pancreatitis";

test("HAPS favorable", () => {
  const r = runHAPS({ sex:"female", rebound_or_guarding_present:false, hematocrit_percent:36, creatinine_mg_dl:0.9 });
  expect(r.haps_score).toBe(0);
  expect(r.favorable).toBe(true);
});
