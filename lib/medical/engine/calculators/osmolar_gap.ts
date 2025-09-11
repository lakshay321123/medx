// Osmolar gap calculator.
// Calculated serum osmolality (mOsm/kg) ≈ 2*Na + Glucose/18 + BUN/2.8 + Ethanol/3.7 (if provided)
export type OsmolarGapInputs = {
  na_mmol_l: number;
  glucose_mg_dl: number;
  bun_mg_dl: number;
  ethanol_mg_dl?: number;  // optional
  measured_mosm_kg: number;
};

export function calc_osmolar_gap(i: OsmolarGapInputs): { calc_mosm_kg: number; osm_gap: number } {
  const ethanol = (typeof i.ethanol_mg_dl === "number" && isFinite(i.ethanol_mg_dl)) ? (i.ethanol_mg_dl / 3.7) : 0;
  const calc_mosm_kg = 2 * i.na_mmol_l + (i.glucose_mg_dl / 18) + (i.bun_mg_dl / 2.8) + ethanol;
  const osm_gap = i.measured_mosm_kg - calc_mosm_kg;
  return { calc_mosm_kg: Number(calc_mosm_kg.toFixed(1)), osm_gap: Number(osm_gap.toFixed(1)) };
}

export default calc_osmolar_gap;
