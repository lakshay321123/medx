import { test, expect } from "@jest/globals";
import { runBova } from "../lib/medical/engine/calculators/bova";

test("Bova class III", () => {
  const out = runBova({ sbp_mmHg: 95, hr_bpm: 120, troponin_elevated: true, rv_dysfunction: true });
  expect(out.points).toBe(8);
  expect(out.class).toBe(3);
});
