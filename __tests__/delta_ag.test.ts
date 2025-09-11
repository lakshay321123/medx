import { calc_delta_ag } from "../lib/medical/engine/calculators/delta_ag";

describe("calc_delta_ag", () => {
  it("returns both AG and delta", () => {
    const r = calc_delta_ag({ na_mmol_l: 140, cl_mmol_l: 100, hco3_mmol_l: 24 });
    expect(r.ag).toBe(16);
    expect(r.delta_ag).toBe((16-12) - (24-24));
  });
});
