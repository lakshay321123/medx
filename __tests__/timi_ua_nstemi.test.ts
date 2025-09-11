// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_timi_ua_nstemi } from "../lib/medical/engine/calculators/timi_ua_nstemi";

describe("calc_timi_ua_nstemi", () => {
  it("ranges 0-7 and sums correctly", () => {
    const v = calc_timi_ua_nstemi({
      age_ge_65: true, cad_risk_factors_count: 3, known_cad_ge_50_stenosis: true, asa_use_last_7d: true,
      recent_severe_angina: true, st_deviation_ge_0_5mm: true, positive_biomarker: true
    });
    expect(v).toBe(7);
  });
});
