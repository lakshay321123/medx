import { runPhenytoinSheinerTozer } from "@/lib/medical/engine/calculators/phenytoin_sheiner_tozer";

test("Phenytoin correction", () => {
  const r = runPhenytoinSheinerTozer({ measured_total_ug_ml:8, albumin_g_dl:2.0, esrd:false });
  expect(r.corrected_total_ug_ml).toBeCloseTo(8 / (0.2*2 + 0.1), 3);
});
