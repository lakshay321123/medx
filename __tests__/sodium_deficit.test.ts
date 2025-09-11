import { calc_sodium_deficit } from "../lib/medical/engine/calculators/sodium_deficit";

describe("calc_sodium_deficit", () => {
  it("computes deficit", () => {
    const v = calc_sodium_deficit({ sex: "male", weight_kg: 70, current_na_mmol_l: 120, target_na_mmol_l: 135 });
    expect(v).toBeCloseTo(0.6*70*(135-120), 4);
  });
});
