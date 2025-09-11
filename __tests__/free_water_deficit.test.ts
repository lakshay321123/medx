import { calc_free_water_deficit } from "../lib/medical/engine/calculators/free_water_deficit";

describe("calc_free_water_deficit", () => {
  it("TBW*(Na/140 - 1)", () => {
    const v = calc_free_water_deficit({ weight_kg: 70, sex: "male", serum_na_mmol_l: 154 });
    const tbw = 0.6*70;
    expect(v).toBeCloseTo(tbw*(154/140 - 1), 6);
  });
});
