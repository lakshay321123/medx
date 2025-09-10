  import { calc_timi_ua_nstemi } from "../lib/medical/engine/calculators/timi_ua_nstemi";

  describe("calc_timi_ua_nstemi", () => {

it("sums criteria (5/7)", () => {
  const v = calc_timi_ua_nstemi({
    age_ge_65: true,
    at_least_3_risk_factors: true,
    known_cad_stenosis_ge_50: true,
    aspirin_use_past_7d: false,
    severe_angina_recent: true,
    st_deviation_ge_0_5mm: true,
    elevated_markers: false,
  });
  expect(v).toBe(5);
});

  });
