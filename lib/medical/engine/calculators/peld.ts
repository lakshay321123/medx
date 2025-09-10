import { register } from "../registry";

export function runPELD(i:{ bilirubin_mg_dL:number, inr:number, albumin_g_dL:number, age_years:number, growth_failure:boolean }){
  if (Object.values(i).some(v=>v==null || !isFinite(v as number))) return null;
  const ln = Math.log;
  const score = 10*(0.480*ln(i.bilirubin_mg_dL) + 1.857*ln(i.inr) - 0.687*ln(i.albumin_g_dL) + (i.growth_failure?0.436:0) + (i.age_years<1?0.667:0));
  return { PELD: Number(score.toFixed(1)) };
}
register({ id:"peld", label:"PELD", inputs:[
  {key:"bilirubin_mg_dL",required:true},{key:"inr",required:true},{key:"albumin_g_dL",required:true},{key:"age_years",required:true},{key:"growth_failure",required:true}
], run: runPELD as any });
