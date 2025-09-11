import { calc_corrected_phenytoin } from "../lib/medical/engine/calculators/corrected_phenytoin";

describe("calc_corrected_phenytoin", () => {
  it("uses ESRD-adjusted denominator when esrd=true", () => {
    const normal = calc_corrected_phenytoin({ total_phenytoin_mcg_ml: 10, albumin_g_dl: 2.0, esrd: false });
    const esrd = calc_corrected_phenytoin({ total_phenytoin_mcg_ml: 10, albumin_g_dl: 2.0, esrd: true });
    expect(esrd).toBeGreaterThan(normal);
  });
});
