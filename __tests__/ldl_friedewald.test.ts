import { runLDL_Friedewald } from "@/lib/medical/engine/calculators/ldl_friedewald";

test("LDL Friedewald valid and invalid", () => {
  const ok = runLDL_Friedewald({ total_chol_mg_dl:200, hdl_mg_dl:50, trig_mg_dl:150 });
  expect(ok.valid).toBe(true);
  expect(ok.ldl_mg_dl).toBeCloseTo(200 - 50 - 150/5, 3);
  const bad = runLDL_Friedewald({ total_chol_mg_dl:200, hdl_mg_dl:50, trig_mg_dl:450 });
  expect(bad.valid).toBe(false);
  expect(bad.ldl_mg_dl).toBeNull();
});
