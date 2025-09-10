import { test, expect } from "@jest/globals";
import { runBISAP } from "../lib/medical/engine/calculators/bisap";

test("BISAP low", () => {
  const out = runBISAP({ bun_mg_dl: 20, gcs: 15, sirs_count: 1, age: 40, pleural_effusion: false });
  expect(out.points).toBe(0);
  expect(out.risk_band).toBe("low");
});

test("BISAP high", () => {
  const out = runBISAP({ bun_mg_dl: 35, gcs: 13, sirs_count: 3, age: 70, pleural_effusion: true });
  expect(out.points).toBeGreaterThanOrEqual(4);
  expect(out.risk_band).toBe("high");
});
