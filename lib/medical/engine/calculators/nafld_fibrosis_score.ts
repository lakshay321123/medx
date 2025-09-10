// lib/medical/engine/calculators/nafld_fibrosis_score.ts
// NAFLD fibrosis score (Angulo et al.).

export interface NAFLDInput {
  age_years?: number | null;
  bmi_kg_m2?: number | null;
  has_impaired_fasting_glucose_or_diabetes?: boolean | null;
  ast_u_L?: number | null;
  alt_u_L?: number | null;
  platelets_k_per_uL?: number | null;
  albumin_g_dL?: number | null;
}

export interface NAFLDOutput {
  score: number;
  category: "low" | "indeterminate" | "high";
}

export function runNAFLD_FS(i: NAFLDInput): NAFLDOutput {
  const age = i.age_years ?? 0;
  const bmi = i.bmi_kg_m2 ?? 0;
  const ifg_dm = i.has_impaired_fasting_glucose_or_diabetes ? 1 : 0;
  const ast = i.ast_u_L ?? 0;
  const alt = i.alt_u_L ?? 1;
  const plt = i.platelets_k_per_uL ?? 0;
  const alb = i.albumin_g_dL ?? 0;
  const ratio = ast / alt;

  const score = -1.675 + 0.037*age + 0.094*bmi + 1.13*ifg_dm + 0.99*ratio - 0.013*plt - 0.66*alb;
  let category: "low"|"indeterminate"|"high" = "indeterminate";
  if (score < -1.455) category = "low";
  else if (score > 0.676) category = "high";
  return { score, category };
}
