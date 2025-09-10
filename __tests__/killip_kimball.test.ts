
import { test, expect } from "@jest/globals";
import { runKillip } from "../lib/medical/engine/calculators/killip_kimball";

test("Killip IV when shock present", () => {
  const out = runKillip({ cardiogenic_shock: true });
  expect(out.killip_class).toBe(4);
});
