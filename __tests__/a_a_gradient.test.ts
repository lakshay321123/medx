import { calc_a_a_gradient } from "../lib/medical/engine/calculators/a_a_gradient";

describe("calc_a_a_gradient", () => {
  it("uses alveolar gas equation and expected normal", () => {
    const r = calc_a_a_gradient({ age_years: 40, fio2_percent: 21, pao2_mm_hg: 95, paco2_mm_hg: 40 });
    const pao2_alv = (760-47)*0.21 - (40/0.8);
    expect(r.alveolar_po2).toBeCloseTo(pao2_alv, 6);
    expect(r.aagrad).toBeCloseTo(pao2_alv - 95, 6);
    expect(r.expected_normal).toBeCloseTo((40+10)/4, 6);
  });
});
