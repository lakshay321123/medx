import { runCRB65 } from "@/lib/medical/engine/calculators/crb65";

test("CRB-65 total", () => {
  const r = runCRB65({ confusion:true, rr_per_min:34, sbp_mmHg:88, dbp_mmHg:55, age:70 });
  expect(r.score).toBe(4);
});
