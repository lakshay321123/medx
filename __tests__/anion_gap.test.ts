  import { calc_anion_gap } from "../lib/medical/engine/calculators/anion_gap";

  describe("calc_anion_gap", () => {

it("computes anion gap", () => {
  const v = calc_anion_gap({ Na: 140, Cl: 104, HCO3: 24 });
  expect(v).toBe(12);
});

  });
