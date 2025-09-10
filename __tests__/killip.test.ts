import { test, expect } from "@jest/globals";
import { runKillip } from "../lib/medical/engine/calculators/killip";

test("Killip 4 when shock present", () => {
  const out = runKillip({ cardiogenic_shock: true });
  expect(out.killip).toBe(4);
});
