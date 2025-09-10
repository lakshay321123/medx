import { register } from "../registry";

/**
 * MAGGIC (scaffold): returns a surrogate composite from age, EF, NYHA, SBP, BMI, Cr, sex, COPD, DM, current smoker.
 * Replace with official MAGGIC point table for exact risk %.
 */
export function runMAGGIC(i:{ age_years:number, ef_pct:number, nyha_class:1|2|3|4, sbp_mmHg:number, bmi:number, creat_mg_dL:number, female:boolean, copd:boolean, diabetes:boolean, current_smoker:boolean }){
  if (Object.values(i).some(v=>v==null || (typeof v==="number" && notFinite(v as number)))) return null;
  function notFinite(x:number){ return !isFinite(x); }
  let s = 0;
  s += Math.max(0, i.age_years-50)/10;
  s += Math.max(0, 40 - i.ef_pct)/10;
  s += (i.nyha_class-1)*1.5;
  s += Math.max(0, 110 - i.sbp_mmHg)/30;
  s += Math.max(0, 1.2 - (i.creat_mg_dL||1.2))*2;
  s += i.female?0:0.5;
  s += i.copd?1:0;
  s += i.diabetes?1:0;
  s += i.current_smoker?1:0;
  const surrogate = Math.round(s*4);
  const band = surrogate<5?"low":surrogate<10?"intermediate":"high";
  return { MAGGIC_surrogate: surrogate, risk_band: band, note:"Scaffold—swap in official MAGGIC points to get absolute risk." };
}
register({ id:"maggic_scaffold", label:"MAGGIC (scaffold)", inputs:[
  {key:"age_years",required:true},{key:"ef_pct",required:true},{key:"nyha_class",required:true},{key:"sbp_mmHg",required:true},
  {key:"bmi",required:true},{key:"creat_mg_dL",required:true},{key:"female",required:true},{key:"copd",required:true},
  {key:"diabetes",required:true},{key:"current_smoker",required:true}
], run: runMAGGIC as any });
