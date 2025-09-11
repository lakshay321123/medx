import { calc_delta_ag } from "../lib/medical/engine/calculators/delta_ag";

test("delta AG basic", () => {
  const r = calc_delta_ag({ na_mmol_l: 140, cl_mmol_l: 105, hco3_mmol_l: 20 });
  expect(r.ag).toBe(15);
  // delta-AG = (15-12) - (24-20) = 3 - 4 = -1
  expect(r.delta_ag).toBe(-1);
});
