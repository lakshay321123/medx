  import { calc_free_water_deficit } from "../lib/medical/engine/calculators/free_water_deficit";

  describe("calc_free_water_deficit", () => {

it("computes free water deficit (male, 70 kg, Na 155)", () => {
  const r = calc_free_water_deficit({ serum_na: 155, weight_kg: 70, sex: "male" });
  expect(Math.round(r.tbw)).toBe(42);
  expect(r.deficit).toBeCloseTo(4.5, 1);
});

  });
