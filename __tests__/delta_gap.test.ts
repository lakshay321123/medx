import { calc_delta_gap } from "../lib/medical/engine/calculators/delta_gap";

describe("calc_delta_gap", () => {
  it("computes AG and ratio", () => {
    const r = calc_delta_gap({ sodium_mmol_l: 140, chloride_mmol_l: 100, hco3_mmol_l: 10 });
    expect(r.ag).toBe(30);
    expect(r.delta_ag).toBe(18);
    expect(r.delta_bicarb).toBe(14);
    expect(r.ratio).toBeCloseTo(18 / 14, 4);
  });
});
