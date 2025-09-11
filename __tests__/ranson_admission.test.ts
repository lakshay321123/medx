// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_ranson_admission } from "../lib/medical/engine/calculators/ranson_admission";

describe("calc_ranson_admission", () => {
  it("scores non-gallstone example at 5", () => {
    const v = calc_ranson_admission({ etiology: "non_gallstone", age_years: 60, wbc_k_per_uL: 20, glucose_mg_dl: 250, ldh_u_l: 400, ast_u_l: 300 });
    expect(v).toBe(5);
  });
});
