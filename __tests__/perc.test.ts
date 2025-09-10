import { test, expect } from "@jest/globals";
import { runPERC } from "../lib/medical/engine/calculators/perc";

test("PERC negative", () => {
  const out = runPERC({ age: 25, hr: 80, sao2: 98, hemoptysis: false, estrogen: false, prior_vte: false, recent_surgery_or_trauma: false, unilateral_leg_swelling: false });
  expect(out.perc_negative).toBe(true);
});

test("PERC positive", () => {
  const out = runPERC({ age:55, hr:110, sao2:92, hemoptysis:true });
  expect(out.perc_negative).toBe(false);
  expect(out.positive_criteria.length).toBeGreaterThanOrEqual(2);
});
