import { test, expect } from "@jest/globals";
import { runABCD2 } from "../lib/medical/engine/calculators/abcd2";

test("ABCD2 moderate", () => {
  const out = runABCD2({ age_ge_60:true, sbp_ge_140_or_dbp_ge_90:true, clinical_unilateral_weakness:false, clinical_speech_disturbance_without_weakness:true, duration_min:30, diabetes:true });
  expect(out.points).toBe(1+1+1+1+1);
  expect(out.risk_band).toBe("moderate");
});
