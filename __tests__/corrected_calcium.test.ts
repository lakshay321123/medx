// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_corrected_calcium } from "../lib/medical/engine/calculators/corrected_calcium";

describe("calc_corrected_calcium", () => {
  it("adds 0.8 per deficit from albumin 4", () => {
    const v = calc_corrected_calcium({ calcium_mg_dl: 8.0, albumin_g_dl: 2.0 });
    expect(v).toBeCloseTo(8.0 + 0.8 * (4 - 2), 3);
  });
});
