import { calc_sirs } from "../lib/medical/engine/calculators/sirs_criteria";

describe("calc_sirs", () => {
  it("counts abnormal vitals/labs", () => {
    const r = calc_sirs({ temp_c: 39, hr: 110, rr: 18, paco2_mm_hg: 30, wbc_k: 5, bands_percent: 0 });
    expect(r.score).toBeGreaterThanOrEqual(2);
    expect(r.sepsis_flag).toBe(true);
  });
});
