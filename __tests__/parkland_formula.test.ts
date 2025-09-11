import { calc_parkland } from "../lib/medical/engine/calculators/parkland_formula";

describe("calc_parkland", () => {
  it("computes classic 4 mL/kg/%TBSA", () => {
    const r = calc_parkland({ weight_kg: 70, tbsa_percent: 20 });
    expect(r.total_ml).toBe(4*70*20);
    expect(r.first8_ml + r.next16_ml).toBe(r.total_ml);
  });
});
