
import { register } from "../registry";

export type YEARSInputs = {
  clinical_signs_dvt:boolean,
  hemoptysis:boolean,
  pe_most_likely:boolean,
  d_dimer_ng_mL: number // report in ng/mL FEU
};

export function runYEARS(i:YEARSInputs){
  if (i==null || i.d_dimer_ng_mL==null || !isFinite(i.d_dimer_ng_mL)) return null;
  const items = [i.clinical_signs_dvt, i.hemoptysis, i.pe_most_likely].filter(Boolean).length;
  const threshold = items===0 ? 1000 : 500;
  const ruled_out = i.d_dimer_ng_mL < threshold;
  return { YEARS_items: items, d_dimer_threshold_ng_mL: threshold, ruled_out };
}

register({ id:"years_rule", label:"YEARS rule", inputs:[
  {key:"clinical_signs_dvt",required:true},{key:"hemoptysis",required:true},{key:"pe_most_likely",required:true},{key:"d_dimer_ng_mL",required:true}
], run: runYEARS as any });
