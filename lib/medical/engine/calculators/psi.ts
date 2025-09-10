import { register } from "../registry";

export type PSIInputs = {
  age_years:number, male:boolean, nursing_home:boolean,
  neoplastic_disease:boolean, liver_disease:boolean, chf:boolean, cerebrovascular:boolean, renal_disease:boolean,
  altered_mental_status:boolean, rr_bpm:number, sbp_mmHg:number, temp_c:number, hr_bpm:number,
  ph_arterial:number, bun_mg_dL:number, sodium_mEq_L:number, glucose_mg_dL:number, hematocrit_pct:number, SaO2_pct:number,
  pleural_effusion:boolean
};
export function runPSI(i:PSIInputs){
  if (i==null) return null;
  let s = i.age_years + (i.male?0:-10);
  s += i.nursing_home?10:0;
  if (i.neoplastic_disease) s+=30;
  if (i.liver_disease) s+=20;
  if (i.chf) s+=10;
  if (i.cerebrovascular) s+=10;
  if (i.renal_disease) s+=10;
  if (i.altered_mental_status) s+=20;
  if (i.rr_bpm>29) s+=20;
  if (i.sbp_mmHg<90) s+=20;
  if (i.temp_c<35 || i.temp_c>40) s+=15;
  if (i.hr_bpm>124) s+=10;
  if (i.ph_arterial<7.35) s+=30;
  if (i.bun_mg_dL>29) s+=20;
  if (i.sodium_mEq_L<130) s+=20;
  if (i.glucose_mg_dL>249) s+=10;
  if (i.hematocrit_pct<30) s+=10;
  if (i.SaO2_pct<90) s+=10;
  if (i.pleural_effusion) s+=10;
  let cls = "I/II (≤70)"; if (s>130) cls="V (>130)"; else if (s>110) cls="IV (111–130)"; else if (s>90) cls="III (91–110)";
  return { PSI: s, risk_class: cls };
}
register({ id:"psi_full", label:"Pneumonia Severity Index (PSI)", inputs:[
  {key:"age_years",required:true},{key:"male",required:true},{key:"nursing_home",required:true},
  {key:"neoplastic_disease",required:true},{key:"liver_disease",required:true},{key:"chf",required:true},{key:"cerebrovascular",required:true},{key:"renal_disease",required:true},
  {key:"altered_mental_status",required:true},{key:"rr_bpm",required:true},{key:"sbp_mmHg",required:true},{key:"temp_c",required:true},{key:"hr_bpm",required:true},
  {key:"ph_arterial",required:true},{key:"bun_mg_dL",required:true},{key:"sodium_mEq_L",required:true},{key:"glucose_mg_dL",required:true},{key:"hematocrit_pct",required:true},{key:"SaO2_pct",required:true},
  {key:"pleural_effusion",required:true}
], run: runPSI as any });
