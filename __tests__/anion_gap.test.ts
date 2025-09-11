// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_anion_gap } from "../lib/medical/engine/calculators/anion_gap";

describe("calc_anion_gap", () => {
  it("computes AG and corrected AG", () => {
    const r = calc_anion_gap({ na_mmol_l: 140, cl_mmol_l: 100, hco3_mmol_l: 24, albumin_g_dl: 2.0 });
    expect(r.ag).toBe(16);
    expect(r.corrected_ag).toBeCloseTo(16 + 2.5*(4-2), 6);
  });
});
