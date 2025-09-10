import { register } from "../registry";

export function runNAFLD_FS(i:{ age_years:number, bmi:number, ifg_or_dm:boolean, ast_u_L:number, alt_u_L:number, platelets_k_uL:number, albumin_g_dL:number }){
  if (Object.values(i).some(v=>v==null || !isFinite(v as number))) return null;
  const x = -1.675 + 0.037*i.age_years + 0.094*i.bmi + (i.ifg_or_dm?1.13:0) + 0.99*(i.ast_u_L/i.alt_u_L) - 0.013*i.platelets_k_uL - 0.66*i.albumin_g_dL;
  let band = "indeterminate"; if (x<-1.455) band="low"; else if (x>0.676) band="high";
  return { NAFLD_FS: Number(x.toFixed(3)), band };
}
register({ id:"nafld_fs", label:"NAFLD Fibrosis Score", inputs:[
  {key:"age_years",required:true},{key:"bmi",required:true},{key:"ifg_or_dm",required:true},{key:"ast_u_L",required:true},{key:"alt_u_L",required:true},{key:"platelets_k_uL",required:true},{key:"albumin_g_dL",required:true}
], run: runNAFLD_FS as any });
