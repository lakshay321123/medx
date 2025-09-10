import { register } from "../registry";

export type CHA2DS2VAScInputs = {
  congestive_hf:boolean, hypertension:boolean, age_years:number,
  diabetes:boolean, stroke_tia_thromboembolism:boolean,
  vascular_disease:boolean, female:boolean
};
export function runCHA2DS2VASc(i:CHA2DS2VAScInputs){
  if (i==null || i.age_years==null || !isFinite(i.age_years)) return null;
  let pts = 0;
  pts += i.congestive_hf?1:0;
  pts += i.hypertension?1:0;
  pts += i.age_years>=75?2 : i.age_years>=65?1:0;
  pts += i.diabetes?1:0;
  pts += i.stroke_tia_thromboembolism?2:0;
  pts += i.vascular_disease?1:0;
  pts += i.female?1:0;
  return { CHA2DS2_VASc: pts };
}
register({ id:"cha2ds2_vasc", label:"CHA₂DS₂‑VASc", inputs:[
  {key:"congestive_hf",required:true},{key:"hypertension",required:true},{key:"age_years",required:true},
  {key:"diabetes",required:true},{key:"stroke_tia_thromboembolism",required:true},{key:"vascular_disease",required:true},{key:"female",required:true}
], run: runCHA2DS2VASc as any });
