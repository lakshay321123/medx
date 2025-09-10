import { register } from "../registry";

export function runAIMS65(i:{ albumin_g_dL:number, inr:number, mental_status_altered:boolean, sbp_mmHg:number, age_years:number }){
  if (Object.values(i).some(v=>v==null || !isFinite(v as number))) return null;
  const pts = (i.albumin_g_dL<3.0?1:0) + (i.inr>1.5?1:0) + (i.mental_status_altered?1:0) + (i.sbp_mmHg<=90?1:0) + (i.age_years>=65?1:0);
  return { AIMS65: pts };
}
register({ id:"aims65", label:"AIMS65 (UGIB)", inputs:[
  {key:"albumin_g_dL",required:true},{key:"inr",required:true},{key:"mental_status_altered",required:true},{key:"sbp_mmHg",required:true},{key:"age_years",required:true}
], run: runAIMS65 as any });
