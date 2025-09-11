import { calc_mdrd_egfr } from "../lib/medical/engine/calculators/mdrd_egfr";

describe("calc_mdrd_egfr", () => {
  it("computes an example eGFR", () => {
    const v = calc_mdrd_egfr({ sex: "male", age_years: 60, creatinine_mg_dl: 1.2 });
    expect(typeof v).toBe("number");
    expect(v).toBeGreaterThan(0);
  });
});
