import { calc_anion_gap } from "../lib/medical/engine/calculators/anion_gap";

describe("calc_anion_gap", () => {
  it("computes corrected AG", () => {
    const r = calc_anion_gap({ sodium_mmol_l: 140, chloride_mmol_l: 100, bicarbonate_mmol_l: 24, albumin_g_dl: 2.0 });
    expect(r.ag).toBe(16);
    expect(r.corrected).toBeCloseTo(16 + 2.5*(4-2), 2);
  });
});
