import { register } from "../registry";

/**
 * ADHERE risk tree (simplified): BUN ≥43 mg/dL OR SBP <115 mmHg OR Cr ≥2.75 mg/dL → higher risk.
 * Returns flags; use as adjunct.
 */
export function runADHERE(i:{ bun_mg_dL:number, sbp_mmHg:number, creat_mg_dL:number }){
  if ([i.bun_mg_dL,i.sbp_mmHg,i.creat_mg_dL].some(v=>v==null || !isFinite(v as number))) return null;
  const high = (i.bun_mg_dL>=43) || (i.sbp_mmHg<115) || (i.creat_mg_dL>=2.75);
  return { ADHERE_high_risk: high };
}
register({ id:"adhere_tree", label:"ADHERE risk (tree, simplified)", inputs:[
  {key:"bun_mg_dL",required:true},{key:"sbp_mmHg",required:true},{key:"creat_mg_dL",required:true}
], run: runADHERE as any });
