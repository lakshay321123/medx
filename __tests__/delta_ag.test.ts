import { calc_delta_ag } from "../lib/medical/engine/calculators/delta_ag";

describe("calc_delta_ag", () => {
  it("computes AG and delta gap", () => {
    const r = calc_delta_ag({ na_mmol_l: 140, cl_mmol_l: 100, hco3_mmol_l: 20 });
    expect(r.ag).toBe(20);
    expect(r.delta_gap).toBe(4);
  });
});
