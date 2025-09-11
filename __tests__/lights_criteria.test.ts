// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_lights_criteria } from "../lib/medical/engine/calculators/lights_criteria";

describe("calc_lights_criteria", () => {
  it("flags exudate if any criterion positive", () => {
    const r = calc_lights_criteria({ pleural_protein_g_dl: 4, serum_protein_g_dl: 6, pleural_ldh_u_l: 300, serum_ldh_u_l: 200, serum_ldh_uln_u_l: 250 });
    expect(r.exudate).toBe(true);
  });
});
