
import { register } from "../registry";

// Hestia criteria: if ANY yes -> NOT eligible for outpatient PE management
export function runHestia(i:{
  hemodynamic_instability:boolean, thrombolysis_or_embolectomy_indicated:boolean, active_bleeding_or_high_risk:boolean,
  oxygen_requirement:boolean, severe_renal_or_liver_impairment:boolean, pregnancy:boolean, social_reasons_boolean:boolean,
  pain_requires_iv_medication:boolean, other_medical_or_psych_reason:boolean
}){
  if (i==null) return null;
  const flags = Object.entries(i).filter(([k,v])=>Boolean(v)).map(([k])=>k);
  const eligible_outpatient = flags.length===0;
  return { hestia_flags: flags, eligible_outpatient };
}

register({ id:"hestia_pe", label:"Hestia (PE outpatient suitability)", inputs:[
  {key:"hemodynamic_instability",required:true},{key:"thrombolysis_or_embolectomy_indicated",required:true},
  {key:"active_bleeding_or_high_risk",required:true},{key:"oxygen_requirement",required:true},
  {key:"severe_renal_or_liver_impairment",required:true},{key:"pregnancy",required:true},
  {key:"social_reasons_boolean",required:true},{key:"pain_requires_iv_medication",required:true},{key:"other_medical_or_psych_reason",required:true}
], run: runHestia as any });
