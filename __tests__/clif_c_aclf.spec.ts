
import { runCLIF_C_ACLF } from "../lib/medical/engine/calculators/clif_c_aclf";

test("CLIF-C ACLF", ()=>{
  const out = runCLIF_C_ACLF({ clif_of_score:10, age_years:60, wbc_g_L:12 })!;
  expect(out.CLIF_C_ACLF).toBeGreaterThan(0);
});
