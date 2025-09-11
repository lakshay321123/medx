// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_serum_osmolality } from "../lib/medical/engine/calculators/serum_osmolality";

describe("calc_serum_osmolality", () => {
  it("uses standard conversion factors", () => {
    const v = calc_serum_osmolality({ sodium_mmol_l: 140, glucose_mg_dl: 90, bun_mg_dl: 14, ethanol_mg_dl: 0 });
    expect(v).toBeCloseTo(2*140 + 90/18 + 14/2.8, 3);
  });
});
