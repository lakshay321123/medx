import { calc_centor_mcisaac } from "../lib/medical/engine/calculators/centor_mcisaac";

describe("calc_centor_mcisaac", () => {
  it("applies age adjustment correctly", () => {
    const v1 = calc_centor_mcisaac({ age_years: 10, tonsillar_exudates: true, tender_anterior_cervical_adenopathy: true, fever_gt_38c: false, cough_absent: true });
    expect(v1).toBe(1+1+0+1+1); // +1 age 3-14
    const v2 = calc_centor_mcisaac({ age_years: 50, tonsillar_exudates: true, tender_anterior_cervical_adenopathy: false, fever_gt_38c: false, cough_absent: false });
    expect(v2).toBe(1-1); // -1 for age >=45
  });
});
