  import { calc_bsa_mosteller } from "../lib/medical/engine/calculators/bsa_mosteller";

  describe("calc_bsa_mosteller", () => {

it("computes BSA (Mosteller)", () => {
  const v = calc_bsa_mosteller({ height_cm: 170, weight_kg: 70 });
  expect(v).toBeCloseTo(1.82, 2);
});

  });
