import { calc_adjusted_body_weight } from "../lib/medical/engine/calculators/adjusted_body_weight";

describe("calc_adjusted_body_weight", () => {
  it("returns IBW + 0.4*(actual-IBW)", () => {
    const r = calc_adjusted_body_weight({ actual_weight_kg: 120, height_cm: 180, sex: "male" });
    const inches = 180/2.54;
    const ibw = 50 + 2.3*(inches-60);
    expect(r.adjbw).toBeCloseTo(ibw + 0.4*(120 - ibw), 6);
  });
});
