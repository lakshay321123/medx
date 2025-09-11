// Batch 14 test
import { calc_alvarado } from "../lib/medical/engine/calculators/alvarado";

describe("calc_alvarado", () => {
  it("scores a high-risk case >=7", () => {
    const r = calc_alvarado({
      migration_rlq: true, anorexia: true, nausea_vomiting: true, rlq_tenderness: true,
      rebound_pain: true, fever_c: 38.0, leukocytosis_wbc_k: 12, neutrophil_left_shift: true
    });
    expect(r.score).toBeGreaterThanOrEqual(7);
    expect(r.risk).toBe("high");
  });
});
