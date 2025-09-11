import { calc_bsa_mosteller } from "../lib/medical/engine/calculators/bsa_mosteller";

describe("calc_bsa_mosteller", () => {
  it("matches formula sqrt(cm*kg/3600)", () => {
    const v = calc_bsa_mosteller({ height_cm: 180, weight_kg: 75 });
    expect(v).toBeCloseTo(Math.sqrt(180*75/3600), 6);
  });
});
