import { runCorrectedNa } from "../lib/medical/engine/calculators/corrected_na_glucose";

describe("corrected_na_glucose", () => {
  it("adjusts sodium for hyperglycemia", () => {
    const r = runCorrectedNa({ Na_meq_l: 130, glucose_mg_dl: 300 });
    expect(r?.corrected_na_meq_l).toBeCloseTo(133.2, 1);
  });
});
