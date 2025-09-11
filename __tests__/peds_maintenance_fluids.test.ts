import { calc_peds_maintenance_fluids } from "../lib/medical/engine/calculators/peds_maintenance_fluids";

describe("calc_peds_maintenance_fluids", () => {
  it("uses 4-2-1 rule", () => {
    const r = calc_peds_maintenance_fluids({ weight_kg: 25 });
    // 4*10 + 2*10 + 1*5 = 65 mL/h
    expect(r.rate_ml_h).toBe(65);
    expect(r.total_24h_ml).toBe(65*24);
  });
});
