import { test, expect } from "@jest/globals";
import { runBAP65 } from "../lib/medical/engine/calculators/bap65";

test("BAP-65 low risk (A)", () => {
  const out = runBAP65({
    bun_mg_dL: 18,
    altered_mental_status: false,
    pulse_bpm: 96,
    age_years: 58,
  });
  expect(out.points).toBe(0);
  expect(out.group).toBe("A");
  expect(out.flags.bun_ge_25).toBe(false);
});

test("BAP-65 high risk (D)", () => {
  const out = runBAP65({
    bun_mg_dL: 30,
    altered_mental_status: true,
    pulse_bpm: 120,
    age_years: 70,
  });
  expect(out.points).toBe(4);
  expect(out.group).toBe("D");
  expect(out.flags.pulse_ge_110).toBe(true);
});
