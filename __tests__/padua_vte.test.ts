import { calc_padua_vte } from "../lib/medical/engine/calculators/padua_vte";

describe("calc_padua_vte", () => {
  it("classifies high risk at >=4", () => {
    const r = calc_padua_vte({ active_cancer: true, previous_vte: false, reduced_mobility: true, thrombophilia: false, recent_trauma_or_surgery: false, age_ge_70: false, heart_or_respiratory_failure: false, acute_mi_or_stroke: false, acute_infection_or_rheum: false, bmi_ge_30: false, hormonal_treatment: false });
    expect(r.score).toBe(6);
    expect(r.risk).toBe("high");
  });
});
