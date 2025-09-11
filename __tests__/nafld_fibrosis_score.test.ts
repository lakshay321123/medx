import { calc_nafld_fs } from "../lib/medical/engine/calculators/nafld_fibrosis_score";

describe("calc_nafld_fs", () => {
  it("computes an example NFS", () => {
    const v = calc_nafld_fs({
      age_years: 55, bmi_kg_m2: 32, ifg_or_diabetes: true,
      ast_u_l: 60, alt_u_l: 50, platelets_10e9_l: 200, albumin_g_dl: 3.5
    });
    expect(v).toBeCloseTo(-1.675 + 0.037*55 + 0.094*32 + 1.13*1 + 0.99*(60/50) - 0.013*200 - 0.66*3.5, 3);
  });
});
