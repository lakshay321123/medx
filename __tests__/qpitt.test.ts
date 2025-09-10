import { test, expect } from "@jest/globals";
import { runqPitt } from "../lib/medical/engine/calculators/qpitt";

test("qPitt bands", () => {
  const low = runqPitt({ temp_c_lt_36: false, sbp_lt_90: false, mech_vent: false, cardiac_arrest: false, altered_mental_status: false });
  expect(low.points).toBe(0);
  expect(low.risk_band).toBe("low");

  const high = runqPitt({ temp_c_lt_36: true, sbp_lt_90: true, mech_vent: true, cardiac_arrest: true, altered_mental_status: false });
  expect(high.points).toBe(4);
  expect(high.risk_band).toBe("high");
});
