import { decafScore } from "../lib/medical/engine/calculators/decaf";

test("DECAF sample", () => {
  const out = decafScore({ emrcd: 5, dyspnea_5b: true, eos_count_10e9_per_L: 0.01, consolidation: true, arterial_pH: 7.28, atrial_fibrillation: true });
  expect(out.total).toBe(6);
  expect(out.risk_band).toBe("high");
});
