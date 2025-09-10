import { runHEART } from "@/lib/medical/engine/calculators/heart_score";

test("HEART bands", () => {
  const r = runHEART({ history_score:2, ecg_score:1, age_score:2, risk_factors_score:1, troponin_score:2 });
  expect(r.score).toBe(8);
  expect(r.band).toBe("high");
});
