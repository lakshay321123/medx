import { runCockcroftGault } from "@/lib/medical/engine/calculators/cockcroft_gault";

test("Cockcroft-Gault", () => {
  const r = runCockcroftGault({ age:60, sex:"male", weight_kg:80, scr_mg_dl:1.0 });
  expect(r.crcl_ml_min).toBeCloseTo(((140-60)*80)/72, 2);
});
