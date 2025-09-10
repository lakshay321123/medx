import { runqSOFA } from "@/lib/medical/engine/calculators/qsofa";

test("qSOFA screen", () => {
  const r = runqSOFA({ rr_per_min:24, sbp_mmHg:98, gcs:14 });
  expect(r.score).toBe(3);
  expect(r.positive).toBe(true);
});
