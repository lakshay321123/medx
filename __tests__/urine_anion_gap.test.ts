import { runUrineAnionGap } from "@/lib/medical/engine/calculators/urine_anion_gap";

test("UAG", () => {
  const r = runUrineAnionGap({ urine_na:50, urine_k:25, urine_cl:80 });
  expect(r.uag).toBe(-5);
});
