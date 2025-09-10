import { runEGFR_MDRD } from "@/lib/medical/engine/calculators/egfr_mdrd";

test("MDRD sanity", () => {
  const r = runEGFR_MDRD({ sex:"female", age:50, scr_mg_dl:1.0 });
  expect(r.egfr_ml_min_1_73m2).toBeGreaterThan(60);
});
