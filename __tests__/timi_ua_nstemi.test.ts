import { calc_timi_ua_nstemi } from "../lib/medical/engine/calculators/timi_ua_nstemi";

describe("calc_timi_ua_nstemi", () => {
  it("classifies high risk at >=5", () => {
    const r = calc_timi_ua_nstemi({ age_ge_65: true, at_least_3_risk_factors_cad: true, known_cad_stenosis_ge_50: true, asa_in_last_7d: true, recent_severe_angina: false, st_deviation_ge_0_5mm: true, positive_biomarker: false });
    expect(r.score).toBe(5);
    expect(r.risk).toBe("high");
  });
});
