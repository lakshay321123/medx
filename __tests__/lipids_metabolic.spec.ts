
import { runNonHDLCholesterol, runLDLHDLRatio, runTGHDLRatio, runAtherogenicIndex, runRemnantCholesterol } from "../lib/medical/engine/calculators/lipids_metabolic";

test("Lipid metrics", () => {
  expect(runNonHDLCholesterol({ total_chol_mg_dL:200, hdl_mg_dL:50 })!.non_hdl_mg_dL).toBe(150);
  expect(runLDLHDLRatio({ ldl_mg_dL:120, hdl_mg_dL:40 })!.ldl_hdl_ratio).toBeCloseTo(3.0,2);
  expect(runTGHDLRatio({ tg_mg_dL:150, hdl_mg_dL:50 })!.tg_hdl_ratio).toBeCloseTo(3.0,2);
  expect(runAtherogenicIndex({ tg_mg_dL:150, hdl_mg_dL:50 })!.atherogenic_index).toBeCloseTo(Math.log10(3),2);
  expect(runRemnantCholesterol({ total_chol_mg_dL:200, hdl_mg_dL:50, ldl_mg_dL:120 })!.remnant_chol_mg_dL).toBe(30);
});
