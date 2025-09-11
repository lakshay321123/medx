// Batch 14 test
import { calc_parkland } from "../lib/medical/engine/calculators/parkland";

describe("calc_parkland", () => {
  it("computes 4 mL/kg/%TBSA", () => {
    const r = calc_parkland({ weight_kg: 70, tbsa_percent: 20 });
    expect(r.total_ml).toBe(4*70*20);
    expect(r.first8h_ml + r.next16h_ml).toBe(r.total_ml);
  });
});
