import { calc_cha2ds2_vasc } from "../lib/medical/engine/calculators/cha2ds2_vasc";

describe("calc_cha2ds2_vasc", () => {
  it("scores a typical high-risk female", () => {
    const v = calc_cha2ds2_vasc({
      age_years: 78, sex: "female", chf: true, htn: true, diabetes: true, stroke_tia_te: false, vascular_disease: true
    });
    // 2(age75+)+1(sex)+1(chf)+1(htn)+1(dm)+1(vasc)=7
    expect(v).toBe(7);
  });
});
