
import { runCorrectedCalciumAlbumin, runCaXPhosProduct } from "../lib/medical/engine/calculators/minerals";

test("Calcium corrections", () => {
  expect(runCorrectedCalciumAlbumin({ calcium_mg_dL:8.0, albumin_g_dL:2.0 })!.corrected_calcium_mg_dL).toBeCloseTo(9.6,1);
  expect(runCaXPhosProduct({ calcium_mg_dL:9.0, phosphate_mg_dL:4.0 })!.ca_x_phos_mg2_dL2).toBe(36);
});
