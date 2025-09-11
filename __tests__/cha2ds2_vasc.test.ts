import { calc_cha2ds2_vasc } from "../lib/medical/engine/calculators/cha2ds2_vasc";

describe("calc_cha2ds2_vasc", () => {
  it("assigns age 75+ two points and female sex one point", () => {
    const v = calc_cha2ds2_vasc({ chf: false, htn: false, age_years: 80, diabetes: false, stroke_tia_te: false, vascular: false, sex: "female" });
    expect(v).toBe(3);
  });
});
