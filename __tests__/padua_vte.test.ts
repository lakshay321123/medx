
import { test, expect } from "@jest/globals";
import { runPadua } from "../lib/medical/engine/calculators/padua_vte";

test("Padua high risk", () => {
  const out = runPadua({
    active_cancer: false,
    previous_vte: true,
    reduced_mobility: true,
    known_thrombophilic_condition: false,
    recent_trauma_or_surgery_1month: false,
    elderly_age_ge_70: true,
    heart_or_respiratory_failure: false,
    acute_mi_or_ischemic_stroke: false,
    acute_infection_or_rheumatologic_disorder: false,
    bmi_ge_30: false,
    ongoing_hormonal_treatment: false
  });
  expect(out.points).toBeGreaterThanOrEqual(7);
  expect(out.high_risk).toBe(true);
});
