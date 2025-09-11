import { calc_bisap } from "../lib/medical/engine/calculators/bisap";

describe("calc_bisap", () => {
  it("sums five binary factors", () => {
    const v = calc_bisap({ bun_mg_dl: 30, impaired_mental_status: true, sirs_ge_2: true, age_ge_60: false, pleural_effusion: true });
    expect(v).toBe(4);
  });
});
