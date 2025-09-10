
import { test, expect } from "@jest/globals";
import { runQPitt } from "../lib/medical/engine/calculators/qpitt";

test("qPitt mid-range", () => {
  const out = runQPitt({ temp_c:35.9, sbp_mmHg:88, on_vasopressors:false, mechanical_ventilation:false, altered_mental_status:true, cardiac_arrest:false });
  expect(out.points).toBe(1 + 1 + 0 + 1 + 0);
});
