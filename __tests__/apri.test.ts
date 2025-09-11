// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_apri } from "../lib/medical/engine/calculators/apri";

describe("calc_apri", () => {
  it("computes APRI", () => {
    const v = calc_apri({ ast_u_l: 80, ast_uln_u_l: 40, platelets_10e9_l: 200 });
    expect(v).toBeCloseTo(((80/40)*100)/200, 6);
  });
});
