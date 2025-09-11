import { calc_free_water_deficit } from "../lib/medical/engine/calculators/free_water_deficit";

describe("calc_free_water_deficit", () => {
  it("computes TBW*((Na/140)-1)", () => {
    const v = calc_free_water_deficit({ sex: "male", weight_kg: 70, na_mmol_l: 154 });
    expect(v).toBeCloseTo(0.6*70*((154/140)-1), 6);
  });
});
