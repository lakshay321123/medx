import { calc_corrected_calcium } from "../lib/medical/engine/calculators/corrected_calcium";

describe("calc_corrected_calcium", () => {
  it("corrects for low albumin", () => {
    const v = calc_corrected_calcium({ measured_ca_mg_dl: 8.0, albumin_g_dl: 2.0 });
    expect(v).toBeCloseTo(8.0 + 0.8*(4.0-2.0), 6);
  });
});
