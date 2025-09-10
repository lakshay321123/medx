/**
 * Pediatric Appendicitis Score (PAS) 0–10
 * Components:
 * - Anorexia (1)
 * - Nausea or vomiting (1)
 * - Migration of pain to RLQ (1)
 * - Fever ≥38 C (1)
 * - Cough/percussion/hopping tenderness (2)
 * - RLQ tenderness (2)
 * - Leukocytosis WBC ≥10 (1)
 * - Neutrophilia ANC ≥7.5 (1)
 * Risk bands: Low (1–3), Intermediate (4–6), High (7–10)
 */
export interface PASInput {
  anorexia: boolean;
  nausea_vomiting: boolean;
  pain_migration: boolean;
  fever_ge_38: boolean;
  cough_hop_tender: boolean;
  rlq_tender: boolean;
  wbc_ge_10: boolean;
  anc_ge_7_5: boolean;
}
export interface PASResult { score: number; risk: "low" | "intermediate" | "high"; }
export function runPAS(i: PASInput): PASResult {
  let s = 0;
  if (i.anorexia) s += 1;
  if (i.nausea_vomiting) s += 1;
  if (i.pain_migration) s += 1;
  if (i.fever_ge_38) s += 1;
  if (i.cough_hop_tender) s += 2;
  if (i.rlq_tender) s += 2;
  if (i.wbc_ge_10) s += 1;
  if (i.anc_ge_7_5) s += 1;
  let risk: PASResult["risk"] = "low";
  if (s >= 7) risk = "high";
  else if (s >= 4) risk = "intermediate";
  return { score: s, risk };
}
