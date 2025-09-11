import { calc_sodium_deficit } from "../lib/medical/engine/calculators/sodium_deficit";

describe("calc_sodium_deficit", () => {
  it("computes TBW*(desired-current)", () => {
    const v = calc_sodium_deficit({ current_na_mmol_l: 120, desired_na_mmol_l: 135, weight_kg: 70, sex: "male" });
    expect(v).toBeCloseTo((0.6*70)*(15), 6);
  });
});
