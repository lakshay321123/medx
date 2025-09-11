import { calc_ideal_body_weight } from "../lib/medical/engine/calculators/ideal_body_weight";

describe("calc_ideal_body_weight", () => {
  it("adds 2.3 kg per inch over 5 ft", () => {
    const male_180cm = calc_ideal_body_weight({ height_cm: 180, sex: "male" });
    const male_178cm = calc_ideal_body_weight({ height_cm: 178, sex: "male" });
    expect(male_180cm - male_178cm).toBeCloseTo(2.3*( (180-178)/2.54 ), 5);
  });
});
