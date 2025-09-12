export const FormulaSpecs: Record<string, string> = {
  anion_gap: "AG = Na - (Cl + HCO3)",
  anion_gap_albumin_corrected: "AG_corr = (Na - (Cl + HCO3)) + 2.5 * (4.0 - albumin_gdl)",
  winter_expected_pco2: "Expected_pCO2 = 1.5 * HCO3 + 8; ignore ±2 for computation",
  serum_osmolality: "Serum_Osm = 2 * Na + (glucose_mgdl / 18) + (BUN_mgdl / 2.8)",
  effective_osmolality: "Effective_Osm = 2 * Na + (glucose_mgdl / 18)",
  delta_gap: "Delta_Gap = ((Na - (Cl + HCO3)) - 12) - (24 - HCO3)",
  // add additional formula specs here as needed
};
