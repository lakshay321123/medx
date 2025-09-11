import { calc_corrected_calcium } from "../lib/medical/engine/calculators/corrected_calcium";

describe("calc_corrected_calcium", () => {
  it("adds 0.8*(4-albumin)", () => {
    const v = calc_corrected_calcium({ measured_ca_mg_dl: 8, albumin_g_dl: 2 });
    expect(v).toBeCloseTo(8 + 0.8*(2), 6);
  });
});
