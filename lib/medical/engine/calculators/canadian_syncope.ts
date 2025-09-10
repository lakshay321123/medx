import { register } from "../registry";

/**
 * Canadian Syncope Risk Score (simplified). Inputs reflect common variables; weights approximate.
 */
export function runCSRS(i:{ predisposition_vasovagal:boolean, history_of_heart_disease:boolean, sbp_extreme:boolean, elevated_troponin:boolean, abnormal_qrs_axis:boolean, qrs_duration_gt130:boolean, qtc_gt480:boolean, shortness_of_breath:boolean }){
  if (i==null) return null;
  let pts = 0;
  pts += i.predisposition_vasovagal? -1 : 0;
  pts += i.history_of_heart_disease? 1 : 0;
  pts += i.sbp_extreme? 2 : 0;
  pts += i.elevated_troponin? 2 : 0;
  pts += (i.abnormal_qrs_axis || i.qrs_duration_gt130 || i.qtc_gt480) ? 1 : 0;
  pts += i.shortness_of_breath? 1 : 0;
  let band = "very low"; if (pts>=4) band="high"; else if (pts>=1) band="medium";
  return { CSRS: pts, risk_band: band };
}
register({ id:"canadian_syncope_risk", label:"Canadian Syncope Risk (simplified)", inputs:[
  {key:"predisposition_vasovagal",required:true},{key:"history_of_heart_disease",required:true},{key:"sbp_extreme",required:true},
  {key:"elevated_troponin",required:true},{key:"abnormal_qrs_axis",required:true},{key:"qrs_duration_gt130",required:true},
  {key:"qtc_gt480",required:true},{key:"shortness_of_breath",required:true}
], run: runCSRS as any });
