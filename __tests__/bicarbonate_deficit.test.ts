  import { calc_bicarbonate_deficit } from "../lib/medical/engine/calculators/bicarbonate_deficit";

  describe("calc_bicarbonate_deficit", () => {

it("computes bicarbonate deficit with default target", () => {
  const r = calc_bicarbonate_deficit({ actual_hco3: 12, weight_kg: 70 });
  expect(r.target).toBe(24);
  expect(r.deficit).toBe(420);
});

  });
