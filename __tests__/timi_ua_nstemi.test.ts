import { calc_timi_ua_nstemi } from "../lib/medical/engine/calculators/timi_ua_nstemi";

describe("calc_timi_ua_nstemi", () => {
  it("sums 7 binary predictors", () => {
    const v = calc_timi_ua_nstemi({ age_ge_65: true, at_least_3_risk_factors_cad: true, known_cad_ge_50_stenosis: true, st_deviation: false, two_angina_episodes_24h: true, aspirin_last_7d: false, elevated_markers: true });
    expect(v).toBe(5);
  });
});
