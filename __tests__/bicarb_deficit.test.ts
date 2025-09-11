import { calc_bicarb_deficit } from "../lib/medical/engine/calculators/bicarb_deficit";

describe("calc_bicarb_deficit", () => {
  it("computes (desired-actual)*0.5*kg", () => {
    const v = calc_bicarb_deficit({ weight_kg: 80, actual_hco3_mmol_l: 10, desired_hco3_mmol_l: 24 });
    expect(v).toBeCloseTo((24-10)*0.5*80, 6);
  });
});
