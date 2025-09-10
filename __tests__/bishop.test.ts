import { test, expect } from "@jest/globals";
import { runBishop } from "../lib/medical/engine/calculators/bishop";

test("Bishop", () => {
  const out = runBishop({ dilation_cm: 3, effacement_pct: 60, station: 0, consistency: "soft", position: "anterior" });
  expect(out.points).toBeGreaterThanOrEqual(7);
});
