
// lib/medical/engine/calculators/toxic_alcohols.ts

export interface ToxicAlcoholInput {
  sodium_mEq_L: number;
  glucose_mg_dL: number;
  bun_mg_dL: number;
  measured_osm_mOsm_kg: number;
  ethanol_mg_dL?: number | null;     // optional
  ethanol_divisor?: 3.7 | 4.6 | number | null; // default 3.7
  chloride_mEq_L?: number | null;
  bicarbonate_mEq_L?: number | null;
  albumin_g_dL?: number | null;      // for AG correction (adds 2.5 per g/dL below 4.0)
}

export interface ToxicAlcoholOutput {
  calculated_osm_mOsm_kg: number;
  osmolal_gap_mOsm_kg: number;
  anion_gap_mEq_L: number | null;
  ag_albumin_corrected_mEq_L: number | null;
  suggest_toxic_alcohols: boolean; // heuristic: OG>=20 and (AG>=12 or Alb-corrected AG>=16)
}

export function runToxicAlcohols(i: ToxicAlcoholInput): ToxicAlcoholOutput {
  const ethanolDiv = (i.ethanol_divisor ?? 3.7);
  const ethanolTerm = (i.ethanol_mg_dL ?? 0) / (ethanolDiv || 3.7);
  const calcOsm = 2*i.sodium_mEq_L + (i.glucose_mg_dL/18) + (i.bun_mg_dL/2.8) + ethanolTerm;
  const og = i.measured_osm_mOsm_kg - calcOsm;

  let ag: number | null = null;
  let agCorr: number | null = null;
  if (i.chloride_mEq_L !== null && i.chloride_mEq_L !== undefined && i.bicarbonate_mEq_L !== null && i.bicarbonate_mEq_L !== undefined) {
    ag = i.sodium_mEq_L - (i.chloride_mEq_L as number) - (i.bicarbonate_mEq_L as number);
    const alb = i.albumin_g_dL ?? 4.0;
    const corr = ag + 2.5 * (4.0 - alb);
    agCorr = corr;
  }
  const agFlag = (ag !== null && ag >= 12) || (agCorr !== null && agCorr >= 16);
  const suggest = (og >= 20) && agFlag;
  return { calculated_osm_mOsm_kg: calcOsm, osmolal_gap_mOsm_kg: og, anion_gap_mEq_L: ag, ag_albumin_corrected_mEq_L: agCorr, suggest_toxic_alcohols: suggest };
}
