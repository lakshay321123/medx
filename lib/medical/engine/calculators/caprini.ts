import { register } from "../registry";

/**
 * Caprini score (surgical VTE). Accepts common risk factors and an optional `other_points` for rare items.
 */
export function runCaprini(i:{ age_years:number, bmi_ge30:boolean, swollen_legs:boolean, varicose_veins:boolean, pregnant_or_postpartum:boolean, ocp_or_hormone:boolean, sepsis:boolean, serious_lung_disease:boolean, abnormal_pft:boolean, acute_mi:boolean, congestive_hf:boolean, bedrest_gt72h:boolean, prior_vte:boolean, family_history_vte:boolean, factor_v_leiden_or_thrombophilia:boolean, cancer:boolean, chemo:boolean, major_surgery_gt45min:boolean, arthroplasty_or_hip_fracture:boolean, stroke_with_paralysis:boolean, other_points?:number }){
  if (i==null || i.age_years==null || !isFinite(i.age_years)) return null;
  let pts = 0;
  // 1 point
  if (i.age_years>=41 && i.age_years<=60) pts+=1;
  if (i.bmi_ge30) pts+=1;
  if (i.swollen_legs) pts+=1;
  if (i.varicose_veins) pts+=1;
  if (i.pregnant_or_postpartum) pts+=1;
  if (i.ocp_or_hormone) pts+=1;
  if (i.sepsis) pts+=1;
  if (i.serious_lung_disease) pts+=1;
  if (i.abnormal_pft) pts+=1;
  if (i.acute_mi) pts+=1;
  if (i.congestive_hf) pts+=1;
  if (i.bedrest_gt72h) pts+=1;
  // 2 points
  if (i.age_years>=61 && i.age_years<=74) pts+=2;
  if (i.prior_vte) pts+=3; // some implementations use 3; keep higher risk
  if (i.family_history_vte) pts+=2;
  if (i.factor_v_leiden_or_thrombophilia) pts+=3; // often 3
  if (i.cancer) pts+=2;
  if (i.chemo) pts+=2;
  if (i.major_surgery_gt45min) pts+=2;
  // 5 points (highest risk)
  if (i.arthroplasty_or_hip_fracture) pts+=5;
  if (i.stroke_with_paralysis) pts+=5;
  if (i.age_years>=75) pts+=3;
  if (i.other_points) pts += i.other_points;
  let band = "low"; if (pts>=8) band="very high"; else if (pts>=5) band="high"; else if (pts>=3) band="moderate";
  return { Caprini: pts, risk_band: band };
}
register({ id:"caprini_vte", label:"Caprini (surgical VTE)", inputs:[
  {key:"age_years",required:true},{key:"bmi_ge30",required:true},{key:"swollen_legs",required:true},{key:"varicose_veins",required:true},
  {key:"pregnant_or_postpartum",required:true},{key:"ocp_or_hormone",required:true},{key:"sepsis",required:true},{key:"serious_lung_disease",required:true},
  {key:"abnormal_pft",required:true},{key:"acute_mi",required:true},{key:"congestive_hf",required:true},{key:"bedrest_gt72h",required:true},
  {key:"prior_vte",required:true},{key:"family_history_vte",required:true},{key:"factor_v_leiden_or_thrombophilia",required:true},
  {key:"cancer",required:true},{key:"chemo",required:true},{key:"major_surgery_gt45min",required:true},{key:"arthroplasty_or_hip_fracture",required:true},
  {key:"stroke_with_paralysis",required:true},{key:"other_points"}
], run: runCaprini as any });
