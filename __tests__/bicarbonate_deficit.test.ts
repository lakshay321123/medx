// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_bicarbonate_deficit } from "../lib/medical/engine/calculators/bicarbonate_deficit";

describe("calc_bicarbonate_deficit", () => {
  it("computes TBW * delta", () => {
    const v = calc_bicarbonate_deficit({ sex: "male", weight_kg: 70, current_hco3_mmol_l: 10, target_hco3_mmol_l: 24 });
    expect(v).toBeCloseTo(0.6 * 70 * (24 - 10), 3);
  });
});
