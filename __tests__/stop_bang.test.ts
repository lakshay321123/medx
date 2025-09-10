
import { test, expect } from "@jest/globals";
import { runSTOPBang } from "../lib/medical/engine/calculators/stop_bang";

test("STOP-Bang high", () => {
  const out = runSTOPBang({ snoring:true, tired:true, observed_apnea:true, high_bp:true, bmi_over_35:true, age_over_50:false, neck_circ_over_40cm:true, male:true });
  expect(out.points).toBeGreaterThanOrEqual(6);
  expect(out.risk_band).toBe("high");
});
