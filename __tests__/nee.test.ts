
import { calcNEE } from "../lib/medical/engine/calculators/vaso_norepi_equiv";

test("NEE formula", () => {
  const v = calcNEE({ norepi: 0.2, epi: 0, phenylephrine: 1, dopamine: 10, metaraminol: 0, vasopressin_u_min: 0.02, angiotensinII: 0 });
  expect(v).toBeGreaterThan(0.2); // added contributions
});
