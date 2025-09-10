  import { calc_alvarado } from "../lib/medical/engine/calculators/alvarado";

  describe("calc_alvarado", () => {

it("scores Alvarado = 10", () => {
  const v = calc_alvarado({
    migration_rlq: true,
    anorexia: true,
    nausea_vomiting: true,
    rlq_tenderness: true,
    rebound_pain: true,
    temp_c: 38.0,
    wbc_k: 12.0,
    left_shift: true,
  });
  expect(v).toBe(10);
});

  });
