import { runNEWS2 } from "@/lib/medical/engine/calculators/news2";

test("NEWS2 aggregation", () => {
  const r = runNEWS2({ rr:26, spo2:90, o2_supplemental:true, temp_c:34.8, sbp:85, hr:135, consciousness:"V" });
  expect(r.total).toBeGreaterThanOrEqual(3+3+2+3+3+3+3);
});
