import { calc_meld_na } from "../lib/medical/engine/calculators/meld_na";

describe("calc_meld_na", () => {
  it("returns meld and meldNa", () => {
    const r = calc_meld_na({ creatinine_mg_dl: 1, bilirubin_mg_dl: 1, inr: 1, sodium_mmol_l: 135 });
    expect(r.meld).toBeGreaterThan(0);
    expect(r.meldNa).toBeGreaterThan(0);
  });
});
