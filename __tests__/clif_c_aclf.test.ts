
import { runCLIFC_ACLF } from "../lib/medical/engine/calculators/clif_c_aclf";

test("CLIF-C ACLF basic", () => {
  const out = runCLIFC_ACLF({ clif_of_score: 12, age_years: 58, wbc_10e9_L: 18 });
  expect(out.CLIF_C_ACLF).toBeGreaterThan(0);
  expect(["lower","intermediate","high","very high"]).toContain(out.risk_band);
});
