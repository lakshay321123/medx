import { calc_centor_mcisaac } from "../lib/medical/engine/calculators/centor_mcisaac";

describe("calc_centor_mcisaac", () => {
  it("applies age modifier", () => {
    const v = calc_centor_mcisaac({ age_years: 50, tonsillar_exudates: true, tender_anterior_cervical_nodes: true, fever_by_history: false, cough_absent: true });
    expect(v).toBe(2);
  });
});
