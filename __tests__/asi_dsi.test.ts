
import { test, expect } from "@jest/globals";
import { runASI_DSI } from "../lib/medical/engine/calculators/shock_asi_dsi";

test("ASI/DSI numeric checks", () => {
  const out = runASI_DSI({ age_years:70, heart_rate_bpm:110, sbp_mmHg:90, dbp_mmHg:50 });
  expect(out.asi).toBeGreaterThan(0);
  expect(out.dsi).toBeGreaterThan(0);
  expect(out.flags.asi_high).toBe(true);
  expect(out.flags.dsi_high).toBe(true);
});
