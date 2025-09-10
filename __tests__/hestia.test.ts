import { test, expect } from "@jest/globals";
import { runHestia } from "../lib/medical/engine/calculators/hestia";

test("Hestia ineligible due to hypoxemia and social issues", () => {
  const out = runHestia({ oxygen_saturation_lt_90: true, social_issues_prevent_outpatient: true });
  expect(out.eligible_outpatient).toBe(false);
  expect(out.failed_criteria.length).toBe(2);
});
