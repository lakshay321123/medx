import { calc_news2 } from "../lib/medical/engine/calculators/news2";

describe("calc_news2", () => {
  it("bumps risk to medium if any component is 3", () => {
    const r = calc_news2({ rr: 8, spo2_percent: 99, temp_c: 37, sbp: 130, hr: 70, consciousness: "A", on_supplemental_o2: false });
    expect(r.score).toBeGreaterThan(0);
    expect(r.risk).toBe("medium");
  });
});
