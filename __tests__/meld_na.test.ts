// Auto-generated calculators for MedX. No ellipses. Typed run(args) signatures.

import { calc_meld_na } from "../lib/medical/engine/calculators/meld_na";

describe("calc_meld_na", () => {
  it("caps creatinine and sodium, returns integers within 6-40", () => {
    const r = calc_meld_na({ creatinine_mg_dl: 6, bilirubin_mg_dl: 10, inr: 3, sodium_mmol_l: 120, on_dialysis: true });
    expect(Number.isInteger(r.meld)).toBe(true);
    expect(Number.isInteger(r.meldNa)).toBe(true);
    expect(r.meldNa).toBeGreaterThanOrEqual(6);
    expect(r.meldNa).toBeLessThanOrEqual(40);
  });
});
