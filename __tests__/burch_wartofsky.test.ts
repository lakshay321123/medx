import { test, expect } from "@jest/globals";
import { runBurchWartofsky } from "../lib/medical/engine/calculators/burch_wartofsky";

test("Burch–Wartofsky storm likely", () => {
  const out = runBurchWartofsky({ temp_c:40.2, cns:"severe", gi_hepatic:"severe", hr_bpm:145, heart_failure:"moderate", atrial_fibrillation:true, precipitant_present:true });
  expect(out.points).toBeGreaterThanOrEqual(45);
  expect(out.storm_likely).toBe(true);
});
