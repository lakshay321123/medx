  import { calc_aa_gradient } from "../lib/medical/engine/calculators/aa_gradient";

  describe("calc_aa_gradient", () => {

it("computes A–a gradient with room air defaults", () => {
  // FiO2=0.21, Pb=760, PH2O=47, R=0.8; PaO2=80, PaCO2=40
  const r = calc_aa_gradient({ pao2: 80, paco2: 40 });
  expect(r.PAO2).toBeCloseTo(99.7, 1);
  expect(r.Aa).toBeCloseTo(19.7, 1);
});

  });
