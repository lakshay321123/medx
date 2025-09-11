import { calc_news2 } from "../lib/medical/engine/calculators/news2";

test("NEWS2 low risk example", () => {
  const r = calc_news2({ rr: 16, spo2_percent: 98, temp_c: 37.0, sbp: 120, hr: 80, consciousness: "alert", on_supplemental_o2: false });
  expect(r.score).toBe(0);
  expect(r.risk).toBe("low");
});

test("NEWS2 medium via any 3", () => {
  const r = calc_news2({ rr: 26, spo2_percent: 98, temp_c: 37.0, sbp: 120, hr: 80, consciousness: "alert", on_supplemental_o2: false });
  expect(r.score).toBeGreaterThanOrEqual(3);
  expect(r.risk).toBe("medium");
});

test("NEWS2 high >=7", () => {
  const r = calc_news2({ rr: 30, spo2_percent: 90, temp_c: 34.9, sbp: 85, hr: 135, consciousness: "pain", on_supplemental_o2: true });
  expect(r.score).toBeGreaterThanOrEqual(7);
  expect(r.risk).toBe("high");
});
