import { bodeScore } from "../lib/medical/engine/calculators/bode_index";

test("BODE sample", () => {
  const out = bodeScore({ bmi: 20, fev1_pct_pred: 40, mmrc: 3, sixmwd_m: 300 });
  expect(out.total).toBe(6);
  expect(out.quartile).toBe(3);
});
