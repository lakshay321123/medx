import { test, expect } from "@jest/globals";
import { runLACE } from "../lib/medical/engine/calculators/lace";

test("LACE index", () => {
  const out = runLACE({ length_of_stay_days: 4, acute_admission_via_ed: true, charlson_index: 3, ed_visits_past6mo: 2 });
  expect(out.score).toBeGreaterThanOrEqual(1);
});
