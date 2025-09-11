import { calc_bsa_mosteller } from "../lib/medical/engine/calculators/bsa_mosteller";

describe("calc_bsa_mosteller", () => {
  it("computes sqrt((cm*kg)/3600)", () => {
    const v = calc_bsa_mosteller({ height_cm: 170, weight_kg: 70 });
    expect(v).toBeCloseTo(Math.sqrt((170*70)/3600), 6);
  });
});
