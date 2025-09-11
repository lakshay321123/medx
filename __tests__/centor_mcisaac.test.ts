// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_centor_mcisaac } from "../lib/medical/engine/calculators/centor_mcisaac";

describe("calc_centor_mcisaac", () => {
  it("handles age modifiers", () => {
    const v1 = calc_centor_mcisaac({ age_years: 10, tonsillar_exudates: true, tender_anterior_cervical_nodes: true, fever_ge_38c: true, absence_of_cough: true });
    const v2 = calc_centor_mcisaac({ age_years: 50, tonsillar_exudates: true, tender_anterior_cervical_nodes: true, fever_ge_38c: true, absence_of_cough: true });
    expect(v1).toBe(5);
    expect(v2).toBe(3);
  });
});
