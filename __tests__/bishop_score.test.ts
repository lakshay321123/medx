// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_bishop_score } from "../lib/medical/engine/calculators/bishop_score";

describe("calc_bishop_score", () => {
  it("computes a high score example", () => {
    const v = calc_bishop_score({ dilation_cm: 4, effacement_percent: 80, station: 0, consistency: "soft", position: "anterior" });
    expect(v).toBe(2 + 3 + 2 + 2 + 2);
  });
});
