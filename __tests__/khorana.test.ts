import { test, expect } from "@jest/globals";
import { runKhorana } from "../lib/medical/engine/calculators/khorana";

test("Khorana intermediate-high", () => {
  const out = runKhorana({ cancer_site_category:"high", platelet_k_per_uL:380, hemoglobin_g_dL:9.5, receiving_esa:false, wbc_k_per_uL:12, bmi_kg_m2:36 });
  expect(out.points).toBeGreaterThanOrEqual(4);
  expect(out.risk_band).toBe("high");
});
