import { test, expect } from "@jest/globals";
import { runTIMI_UA_NSTEMI } from "../lib/medical/engine/calculators/timi_ua_nstemi";

test("TIMI UA NSTEMI middle score", () => {
  const out = runTIMI_UA_NSTEMI({
    age_ge_65: true, cad_risk_factors_ge_3: true, known_cad_stenosis_ge_50: false,
    aspirin_use_past_7d: true, severe_angina_recent: false, st_deviation_ge_0_5mm: true, elevated_cardiac_markers: false
  });
  expect(out.points).toBe(4);
});
