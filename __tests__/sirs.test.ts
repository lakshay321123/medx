import { test, expect } from "@jest/globals";
import { runSIRS } from "../lib/medical/engine/calculators/sirs";

test("SIRS", () => {
  const out = runSIRS({ temp_c: 39, hr: 110, rr: 22, wbc_k: 14, bands_pct: 15 });
  expect(out.count).toBeGreaterThanOrEqual(3);
});
