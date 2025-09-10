import { test, expect } from "@jest/globals";
import { runRockallPre } from "../lib/medical/engine/calculators/rockall_pre";

test("Rockall pre-endoscopy", () => {
  const out = runRockallPre({ age: 75, shock: "tachycardia", comorbidity: "minor" });
  expect(out.points).toBe(1+1+2);
});
