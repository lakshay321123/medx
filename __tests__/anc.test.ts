// Batch 14 test
import { calc_anc } from "../lib/medical/engine/calculators/anc";

describe("calc_anc", () => {
  it("computes ANC from WBC and percentages", () => {
    const v = calc_anc({ wbc_k_per_uL: 6, neutrophils_percent: 50, bands_percent: 5 });
    expect(v).toBeCloseTo(6000 * 0.55, 3);
  });
});
