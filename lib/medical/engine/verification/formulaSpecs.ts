// lib/medical/engine/verification/formulaSpecs.ts
export const FormulaSpecs: Record<string, string> = {
  // Examples — extend this list as needed
  anion_gap: "AG = Na - (Cl + HCO3)",
  anion_gap_albumin_corrected: "AG_corr = (Na - (Cl + HCO3)) + 2.5 * (4.0 - albumin)",
  winter_expected_pco2: "Expected pCO2 = 1.5 * HCO3 + 8 (±2), ignore ± for computation",
  serum_osmolality: "Serum Osm = 2 * Na + (glucose_mgdl / 18) + (BUN_mgdl / 2.8)",
  effective_osmolality: "Effective Osm = 2 * Na + (glucose_mgdl / 18)",
  delta_gap: "Delta Gap = (AG - 12) - (24 - HCO3)",
  // ... add more
};
