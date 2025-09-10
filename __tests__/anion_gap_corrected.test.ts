  import { calc_anion_gap_corrected } from "../lib/medical/engine/calculators/anion_gap_corrected";

  describe("calc_anion_gap_corrected", () => {

it("computes corrected anion gap for albumin", () => {
  const r = calc_anion_gap_corrected({ Na: 140, Cl: 104, HCO3: 24, albumin_g_dl: 2.0 });
  expect(r.ag).toBe(12);
  expect(r.corrected).toBe(17);
});

  });
