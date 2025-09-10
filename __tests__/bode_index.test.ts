import { runBODE } from "@/lib/medical/engine/calculators/bode_index";

test("BODE index total", () => {
  const r = runBODE({ bmi:20, fev1_percent_predicted:30, mmrc:4, six_mwd_m:100 });
  expect(r.score).toBe(1 + 3 + 3 + 3);
});
