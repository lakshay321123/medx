
import { FEPhos, FEMg } from "../lib/medical/engine/calculators/renal_gaps";

test("FEPhos computes", () => {
  const out = FEPhos(2.8, 1.0, 40, 100); // ((40*1)/(2.8*100))*100 = 14.29%
  expect(out.FEPhos_percent).toBeGreaterThan(10);
});

test("FEMg computes", () => {
  const out = FEMg(2.0, 1.0, 10, 100); // ((10*1)/(2*100))*100 = 5%
  expect(out.FEMg_percent).toBeCloseTo(5, 0);
});
