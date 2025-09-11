// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_ranson_48h } from "../lib/medical/engine/calculators/ranson_48h";

describe("calc_ranson_48h", () => {
  it("scores all 6 criteria positive", () => {
    const v = calc_ranson_48h({ hct_fall_percent: 12, bun_rise_mg_dl: 6, calcium_mg_dl: 7.5, pao2_mm_hg: 55, base_deficit_mEq_l: 5, fluid_sequestration_l: 7 });
    expect(v).toBe(6);
  });
});
