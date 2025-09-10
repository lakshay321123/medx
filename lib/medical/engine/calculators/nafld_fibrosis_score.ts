/**
 * NAFLD Fibrosis Score
 * Formula:
 * NFS = -1.675 + 0.037*age + 0.094*BMI + 1.13*ifg_or_diabetes + 0.99*(AST/ALT) - 0.013*platelets(10^9/L) - 0.66*albumin(g/dL)
 * Bands: < -1.455 low, > 0.676 high, otherwise indeterminate
 */
export interface NFSInput {
  age: number;
  bmi: number;
  impaired_fasting_glucose_or_diabetes: boolean;
  ast_u_l: number;
  alt_u_l: number;
  platelets_x10e9_l: number;
  albumin_g_dl: number;
}
export interface NFSResult { nfs: number; band: "low" | "indeterminate" | "high"; }
export function runNAFLD_Fibrosis(i: NFSInput): NFSResult {
  const ratio = i.ast_u_l / i.alt_u_l;
  const nfs = -1.675 + 0.037*i.age + 0.094*i.bmi + 1.13*(i.impaired_fasting_glucose_or_diabetes ? 1 : 0) + 0.99*ratio - 0.013*i.platelets_x10e9_l - 0.66*i.albumin_g_dl;
  let band: NFSResult["band"] = "indeterminate";
  if (nfs < -1.455) band = "low";
  else if (nfs > 0.676) band = "high";
  return { nfs, band };
}
