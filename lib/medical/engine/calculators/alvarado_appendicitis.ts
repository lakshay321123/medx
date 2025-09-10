/**
 * Alvarado score for appendicitis (0 to 10)
 * Migration of pain to RLQ (1)
 * Anorexia (1)
 * Nausea or vomiting (1)
 * RLQ tenderness (2)
 * Rebound tenderness (1)
 * Fever >= 37.3 C (1)
 * Leukocytosis WBC >= 10 (2)
 * Neutrophils >= 75 percent (1)
 * Bands: 1 to 4 low, 5 to 6 compatible, 7 to 8 probable, 9 to 10 very probable
 */
export interface AlvaradoInput {
  migration_rlq: boolean;
  anorexia: boolean;
  nausea_vomiting: boolean;
  rlq_tenderness: boolean;
  rebound_tenderness: boolean;
  fever_ge_37_3: boolean;
  wbc_ge_10: boolean;
  neutrophils_ge_75_percent: boolean;
}
export interface AlvaradoResult { score: number; band: "low" | "compatible" | "probable" | "very_probable"; }
export function runAlvarado(i: AlvaradoInput): AlvaradoResult {
  let s = 0;
  if (i.migration_rlq) s += 1;
  if (i.anorexia) s += 1;
  if (i.nausea_vomiting) s += 1;
  if (i.rlq_tenderness) s += 2;
  if (i.rebound_tenderness) s += 1;
  if (i.fever_ge_37_3) s += 1;
  if (i.wbc_ge_10) s += 2;
  if (i.neutrophils_ge_75_percent) s += 1;
  let band: AlvaradoResult["band"] = "low";
  if (s >= 9) band = "very_probable";
  else if (s >= 7) band = "probable";
  else if (s >= 5) band = "compatible";
  return { score: s, band };
}
