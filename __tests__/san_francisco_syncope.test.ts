import { calc_sfsr } from "../lib/medical/engine/calculators/san_francisco_syncope";
describe("calc_sfsr", () => {
  it("positive when any CHESS criterion present", () => {
    const r = calc_sfsr({ history_chf: false, hematocrit_percent: 45, abnormal_ecg: false, shortness_of_breath: true, sbp_mm_hg: 120 });
    expect(r.positive).toBe(true);
    expect(r.criteria.length).toBe(1);
  });
});
