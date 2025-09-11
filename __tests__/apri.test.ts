import { calc_apri } from "../lib/medical/engine/calculators/apri";

describe("calc_apri", () => {
  it("computes APRI with standard ULN 40", () => {
    const v = calc_apri({ ast_u_l: 80, ast_uln_u_l: 40, platelets_10e9_l: 200 });
    expect(v).toBeCloseTo(1.0, 2);
  });
});
