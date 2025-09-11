// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_cha2ds2_vasc } from "../lib/medical/engine/calculators/cha2ds2_vasc";

describe("calc_cha2ds2_vasc", () => {
  it("computes up to 9", () => {
    const v = calc_cha2ds2_vasc({ chf: true, htn: true, age_75_or_more: true, diabetes: true, stroke_tia_te: true, vascular_disease: true, age_65_74: true, sex_female: true });
    expect(v).toBe(9);
  });
});
