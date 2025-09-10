
import { test, expect } from "@jest/globals";
import { runToxicAlcohols } from "../lib/medical/engine/calculators/toxic_alcohols";

test("Toxic alcohol helper flags with high OG and AG", () => {
  const out = runToxicAlcohols({ sodium_mEq_L:140, glucose_mg_dL:100, bun_mg_dL:14, measured_osm_mOsm_kg:360, ethanol_mg_dL:0, chloride_mEq_L:100, bicarbonate_mEq_L:10, albumin_g_dL:3.0 });
  expect(out.osmolal_gap_mOsm_kg).toBeGreaterThan(20);
  expect(out.suggest_toxic_alcohols).toBe(true);
});
