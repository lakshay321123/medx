import { calc_padua_vte_risk } from "../lib/medical/engine/calculators/padua_vte_risk";

describe("calc_padua_vte_risk", () => {
  it("flags high risk at >=4", () => {
    const r = calc_padua_vte_risk({ active_cancer: true, previous_vte: false, reduced_mobility: true, thrombophilia: false, recent_trauma_or_surgery: false, age_ge_70: false, heart_or_respiratory_failure: false, acute_mi_or_ischemic_stroke: false, acute_infection_or_rheumatologic: false, bmi_ge_30: false, hormonal_treatment: false });
    expect(r.high_risk).toBe(true);
  });
});
