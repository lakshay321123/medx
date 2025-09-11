import { calc_mcisaac } from "../lib/medical/engine/calculators/mcisaac";

describe("calc_mcisaac", () => {
  it("ages 45+ subtract one point", () => {
    const young = calc_mcisaac({ age_years: 10, fever_history: true, absence_of_cough: true, tender_anterior_nodes: false, tonsillar_swelling_exudate: false });
    const old = calc_mcisaac({ age_years: 50, fever_history: true, absence_of_cough: true, tender_anterior_nodes: false, tonsillar_swelling_exudate: false });
    expect(young.score - old.score).toBe(2);
  });
});
