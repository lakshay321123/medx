import { runEGFR_CKDEPI_2021 } from "@/lib/medical/engine/calculators/egfr_ckd_epi_2021";

test("CKD-EPI 2021 ranges", () => {
  const r = runEGFR_CKDEPI_2021({ sex:"male", age:60, scr_mg_dl:1.0 });
  expect(r.egfr_ml_min_1_73m2).toBeGreaterThan(60);
});
