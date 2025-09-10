import { test, expect } from "@jest/globals";
import { runCURB65 } from "../lib/medical/engine/calculators/curb65";

test("CURB-65 low risk", () => {
  const out = runCURB65({ age: 50, rr: 16, sbp: 120, dbp: 80, bun_mg_dl: 12, confusion: false });
  expect(out.points).toBe(0);
  expect(out.risk_band).toBe("low");
});

test("CURB-65 high risk", () => {
  const out = runCURB65({ age: 80, rr: 32, sbp: 88, bun_mg_dl: 30, confusion: true });
  expect(out.points).toBeGreaterThanOrEqual(4);
  expect(out.risk_band).toBe("high");
});
