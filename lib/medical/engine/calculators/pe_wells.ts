
import { register } from "../registry";

export function runWellsPE(i:{ signs_dvt:boolean, alt_dx_less_likely:boolean, hr_gt100:boolean, immob_surg_4w:boolean, prev_dvt_pe:boolean, hemoptysis:boolean, malignancy:boolean }){
  if (i==null) return null;
  let pts = 0;
  if (i.signs_dvt) pts += 3;
  if (i.alt_dx_less_likely) pts += 3;
  if (i.hr_gt100) pts += 1.5;
  if (i.immob_surg_4w) pts += 1.5;
  if (i.prev_dvt_pe) pts += 1.5;
  if (i.hemoptysis) pts += 1;
  if (i.malignancy) pts += 1;
  const band = pts<2 ? "low" : pts<=6 ? "moderate" : "high";
  return { Wells_PE: pts, band };
}

export function runWellsDVT(i:{ active_cancer:boolean, paralysis_recent_immob:boolean, bedridden_3d_major_surg_12w:boolean, localized_tenderness:boolean, leg_swelling:boolean, calf_swelling_ge3cm:boolean, pitting_edema_symptomatic_leg:boolean, collateral_nonvaricose_veins:boolean, alt_dx_at_least_likely:boolean }){
  if (i==null) return null;
  let pts = 0;
  if (i.active_cancer) pts += 1;
  if (i.paralysis_recent_immob) pts += 1;
  if (i.bedridden_3d_major_surg_12w) pts += 1;
  if (i.localized_tenderness) pts += 1;
  if (i.leg_swelling) pts += 1;
  if (i.calf_swelling_ge3cm) pts += 1;
  if (i.pitting_edema_symptomatic_leg) pts += 1;
  if (i.collateral_nonvaricose_veins) pts += 1;
  if (i.alt_dx_at_least_likely) pts -= 2;
  const band = pts<=0 ? "low" : pts<=2 ? "moderate" : "high";
  return { Wells_DVT: pts, band };
}

register({ id:"wells_pe", label:"Wells (PE)", inputs:[
  {key:"signs_dvt",required:true},{key:"alt_dx_less_likely",required:true},{key:"hr_gt100",required:true},
  {key:"immob_surg_4w",required:true},{key:"prev_dvt_pe",required:true},{key:"hemoptysis",required:true},{key:"malignancy",required:true}
], run: runWellsPE as any });

register({ id:"wells_dvt", label:"Wells (DVT)", inputs:[
  {key:"active_cancer",required:true},{key:"paralysis_recent_immob",required:true},{key:"bedridden_3d_major_surg_12w",required:true},
  {key:"localized_tenderness",required:true},{key:"leg_swelling",required:true},{key:"calf_swelling_ge3cm",required:true},
  {key:"pitting_edema_symptomatic_leg",required:true},{key:"collateral_nonvaricose_veins",required:true},{key:"alt_dx_at_least_likely",required:true}
], run: runWellsDVT as any });
