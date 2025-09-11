import { calc_lights_criteria } from "../lib/medical/engine/calculators/lights_criteria";

describe("calc_lights_criteria", () => {
  it("detects exudate if any criterion positive", () => {
    const r = calc_lights_criteria({ pleural_protein_g_dl: 4, serum_protein_g_dl: 6, pleural_ldh_u_l: 200, serum_ldh_u_l: 300, serum_ldh_uln_u_l: 180 });
    expect(r.criteria.protein_ratio).toBe(true);
    expect(r.exudate).toBe(true);
  });
});
