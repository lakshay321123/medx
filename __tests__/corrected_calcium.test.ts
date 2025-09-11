import { calc_corrected_calcium } from "../lib/medical/engine/calculators/corrected_calcium";

describe("calc_corrected_calcium", () => {
  it("corrects downward with high albumin", () => {
    const v = calc_corrected_calcium({ calcium_mg_dl: 9.0, albumin_g_dl: 5.0 });
    expect(v).toBeCloseTo(8.2, 2);
  });
});
