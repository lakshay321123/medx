import { calc_alvarado } from "../lib/medical/engine/calculators/alvarado";

describe("calc_alvarado", () => {
  it("scores 10-point composite", () => {
    const v = calc_alvarado({ migration_rlq: true, anorexia: true, nausea_vomiting: false, rlq_tenderness: true, rebound_pain: true, fever: true, leukocytosis: true, left_shift: true });
    expect(v).toBe(9);
  });
});
