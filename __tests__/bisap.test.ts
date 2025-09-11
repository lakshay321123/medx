import { calc_bisap } from "../lib/medical/engine/calculators/bisap";

describe("calc_bisap", () => {
  it("scores 5 with all risk factors present", () => {
    const v = calc_bisap({ bun_mg_dl: 30, impaired_mental_status: true, sirs_count: 3, age_years: 70, pleural_effusion: true });
    expect(v).toBe(5);
  });
});
