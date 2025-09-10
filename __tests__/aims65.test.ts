import { runAIMS65 } from "@/lib/medical/engine/calculators/aims65";

test("AIMS65 sum", () => {
  const r = runAIMS65({ albumin_g_dl:2.8, inr:1.6, altered_mental_status:true, sbp_mmHg:85, age:70 });
  expect(r.score).toBe(5);
});
