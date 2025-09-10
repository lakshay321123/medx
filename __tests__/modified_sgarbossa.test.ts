import { test, expect } from "@jest/globals";
import { runModifiedSgarbossa } from "../lib/medical/engine/calculators/modified_sgarbossa";

test("Modified Sgarbossa positive by discordant ratio", () => {
  const out = runModifiedSgarbossa({ st_j_mm_by_lead: [2, 0.5], s_wave_depth_mm_by_lead: [6, 1] });
  expect(out.positive).toBe(true);
  expect(out.reasons.length).toBeGreaterThan(0);
});
