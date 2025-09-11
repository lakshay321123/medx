import { calc_alvarado } from "../lib/medical/engine/calculators/alvarado";

describe("calc_alvarado", () => {
  it("reaches 10 with all positive and fever/WBC/left shift", () => {
    const v = calc_alvarado({
      migration_rlq: true, anorexia: true, nausea_vomiting: true, rlq_tenderness: true, rebound_pain: true,
      temp_c: 38, wbc_10e9_l: 12, neutrophils_percent: 80
    });
    expect(v).toBe(10);
  });
});
