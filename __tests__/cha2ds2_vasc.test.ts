import { calc_cha2ds2_vasc } from "../lib/medical/engine/calculators/cha2ds2_vasc";

describe("calc_cha2ds2_vasc", () => {
  it("ages 75+ add 2", () => {
    const v = calc_cha2ds2_vasc({ congestive_heart_failure: false, hypertension: true, age_years: 78, diabetes: false, stroke_tia_thromboembolism: false, vascular_disease: true, sex_female: true });
    expect(v).toBe(5);
  });
});
