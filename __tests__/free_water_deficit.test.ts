import { calc_free_water_deficit } from "../lib/medical/engine/calculators/free_water_deficit";

describe("calc_free_water_deficit", () => {
  it("computes example deficit", () => {
    const v = calc_free_water_deficit({ sex: "male", weight_kg: 70, sodium_mmol_l: 160 });
    const tbw = 0.6*70;
    expect(v).toBeCloseTo(tbw * (160/140 - 1), 4);
  });
});
