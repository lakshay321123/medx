import { runCalciumPhosphateProduct } from "@/lib/medical/engine/calculators/calcium_phosphate_product";

test("Calcium-phosphate product", () => {
  const r = runCalciumPhosphateProduct({ calcium_mg_dl:9, phosphate_mg_dl:6.5 });
  expect(r.product).toBeCloseTo(58.5, 2);
  expect(r.flag_gt_55).toBe(true);
});
