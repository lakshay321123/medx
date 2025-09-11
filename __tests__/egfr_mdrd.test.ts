// Batch 14 test
import { calc_egfr_mdrd } from "../lib/medical/engine/calculators/egfr_mdrd";

describe("calc_egfr_mdrd", () => {
  it("reduces for female by factor 0.742", () => {
    const m = calc_egfr_mdrd({ sex: "male", age_years: 50, scr_mg_dl: 1.0 });
    const f = calc_egfr_mdrd({ sex: "female", age_years: 50, scr_mg_dl: 1.0 });
    expect(f).toBeCloseTo(m * 0.742, 3);
  });
});
