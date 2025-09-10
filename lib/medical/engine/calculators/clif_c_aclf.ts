
import { register } from "../registry";

/**
 * CLIF-C ACLF score (requires CLIF-OF score). Common published formula approximation:
 * CLIF-C ACLF = 10 × (0.33 × CLIF_OF + 0.04 × Age + 0.63 × ln(WBC) − 2)
 * Returns 0–100 scale. If CLIF_OF not supplied, returns needs.
 */
export type CLIFInputs = {
  clif_of_score?: number,
  age_years: number,
  wbc_g_L: number // 10^9/L
};

export function runCLIF_C_ACLF(i:CLIFInputs){
  if ([i.age_years,i.wbc_g_L].some(v=>v==null || !isFinite(v as number))) return null;
  if (i.clif_of_score==null || !isFinite(i.clif_of_score as number)) return { needs:["clif_of_score"] };
  const val = 10 * (0.33 * i.clif_of_score + 0.04 * i.age_years + 0.63 * Math.log(i.wbc_g_L) - 2.0);
  const score = Math.max(0, Math.min(100, val));
  let band = "low"; if (score>=64) band="very high"; else if (score>=54) band="high"; else if (score>=46) band="moderate";
  return { CLIF_C_ACLF: Number(score.toFixed(1)), band, note:"Formula approx; verify against reference implementation." };
}

register({ id:"clif_c_aclf", label:"CLIF-C ACLF", inputs:[
  {key:"clif_of_score"},{key:"age_years",required:true},{key:"wbc_g_L",required:true}
], run: runCLIF_C_ACLF as any });
