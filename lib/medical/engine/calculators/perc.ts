// lib/medical/engine/calculators/perc.ts
export interface PERCInput {
  age?: number | null;
  hr?: number | null;
  sao2?: number | null; // %
  hemoptysis?: boolean | null;
  estrogen?: boolean | null;
  prior_vte?: boolean | null;
  recent_surgery_or_trauma?: boolean | null;
  unilateral_leg_swelling?: boolean | null;
}
export interface PERCOutput { perc_negative: boolean; positive_criteria: string[]; }

export function runPERC(i: PERCInput): PERCOutput {
  const positives: string[] = [];
  if ((i.age ?? 0) >= 50) positives.push("age>=50");
  if ((i.hr ?? 0) >= 100) positives.push("HR>=100");
  if ((i.sao2 ?? 100) < 95) positives.push("SaO2<95%");
  if (i.hemoptysis) positives.push("hemoptysis");
  if (i.estrogen) positives.push("estrogen");
  if (i.prior_vte) positives.push("prior VTE");
  if (i.recent_surgery_or_trauma) positives.push("recent surgery/trauma");
  if (i.unilateral_leg_swelling) positives.push("unilateral leg swelling");
  return { perc_negative: positives.length === 0, positive_criteria: positives };
}
