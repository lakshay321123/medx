
import { register } from "../registry";

export function runSimplifiedGeneva(i:{ age_gt65:boolean, prior_dvt_pe:boolean, surgery_or_fracture_1m:boolean, active_malignancy:boolean, unilateral_leg_pain:boolean, hemoptysis:boolean, hr_bpm:number, pain_on_deep_vein_palpation_unilateral_edema:boolean }){
  if (i==null) return null;
  const hr_pts = i.hr_bpm>=95 ? 2 : (i.hr_bpm>=75 ? 1 : 0);
  const pts = (i.age_gt65?1:0)+(i.prior_dvt_pe?1:0)+(i.surgery_or_fracture_1m?1:0)+(i.active_malignancy?1:0)+(i.unilateral_leg_pain?1:0)+(i.hemoptysis?1:0)+hr_pts+(i.pain_on_deep_vein_palpation_unilateral_edema?1:0);
  const band = pts<=1 ? "low" : pts<=3 ? "intermediate" : "high";
  return { simplified_geneva: pts, band };
}

register({ id:"simplified_geneva", label:"Simplified Geneva (PE)", inputs:[
  {key:"age_gt65",required:true},{key:"prior_dvt_pe",required:true},{key:"surgery_or_fracture_1m",required:true},
  {key:"active_malignancy",required:true},{key:"unilateral_leg_pain",required:true},{key:"hemoptysis",required:true},
  {key:"hr_bpm",required:true},{key:"pain_on_deep_vein_palpation_unilateral_edema",required:true}
], run: runSimplifiedGeneva as any });
