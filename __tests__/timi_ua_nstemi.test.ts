import { calc_timi_ua_nstemi } from "../lib/medical/engine/calculators/timi_ua_nstemi";

describe("calc_timi_ua_nstemi", () => {
  it("gives max score 7 with all risk present", () => {
    const v = calc_timi_ua_nstemi({
      age_years: 70, cad_risk_factors_count: 5, known_cad_stenosis_ge_50: true, aspirin_in_last_7d: true,
      severe_angina_2plus_24h: true, st_deviation_ge_0_5mm: true, elevated_markers: true
    });
    expect(v).toBe(7);
  });
});
