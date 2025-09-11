import { calc_rox_index } from "../lib/medical/engine/calculators/rox_index";

describe("calc_rox_index", () => {
  it("computes (SpO2/FiO2)/√RR with FiO2 as percent", () => {
    const v = calc_rox_index({ spo2_percent: 96, fio2_percent: 40, rr: 20 });
    const s2f = 96/40;
    const expected = s2f / Math.sqrt(20);
    expect(v).toBeCloseTo(expected, 6);
  });
});
