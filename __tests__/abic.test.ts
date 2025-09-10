import { test, expect } from "@jest/globals";
import { runABIC } from "../lib/medical/engine/calculators/abic";

test("ABIC risk bands", () => {
  const low = runABIC({ age_years:40, bilirubin_mg_dL:1.0, inr:1.2, creatinine_mg_dL:0.8 });
  expect(low.risk_band).toBe("low");
  const high = runABIC({ age_years:70, bilirubin_mg_dL:15, inr:2.8, creatinine_mg_dL:1.6 });
  expect(high.risk_band).toBe("high");
});
