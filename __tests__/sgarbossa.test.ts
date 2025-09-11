import { calc_sgarbossa } from "../lib/medical/engine/calculators/sgarbossa";

describe("calc_sgarbossa", () => {
  it("scores per criteria", () => {
    const v = calc_sgarbossa({ concordant_ste_ge_1mm: true, concordant_std_v1_v3_ge_1mm: false, discordant_ste_ge_5mm: true });
    expect(v).toBe(7);
  });
});
