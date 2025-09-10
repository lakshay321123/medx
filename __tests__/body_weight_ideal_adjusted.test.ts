  import { calc_body_weight_ideal_adjusted } from "../lib/medical/engine/calculators/body_weight_ideal_adjusted";

  describe("calc_body_weight_ideal_adjusted", () => {

it("computes Devine IBW and Adjusted BW", () => {
  const r = calc_body_weight_ideal_adjusted({ height_cm: 180, weight_kg: 120, sex: "male" });
  expect(r.ibw).toBeCloseTo(75.0, 1);
  expect(r.adjbw).toBeCloseTo(93.0, 1);
});

  });
