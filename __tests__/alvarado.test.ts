import { calc_alvarado } from "../lib/medical/engine/calculators/alvarado";

describe("calc_alvarado", () => {
  it("ranges 0–10", () => {
    const v = calc_alvarado({ migration_rlq: true, anorexia: true, nausea_vomiting: false, tenderness_rlq: true, rebound: false, elevated_temperature: false, leukocytosis: true, left_shift: true });
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThanOrEqual(10);
  });
});
