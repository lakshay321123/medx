import { register } from "../registry";

export type HASBLEDInputs = {
  hypertension:boolean, abnormal_renal:boolean, abnormal_liver:boolean,
  stroke:boolean, bleeding:boolean, labile_inr:boolean, age_gt65:boolean,
  drugs_antiplatelet_nsaid:boolean, alcohol:boolean
};
export function runHASBLED(i:HASBLEDInputs){
  if (i==null) return null;
  const abn = (i.abnormal_renal?1:0) + (i.abnormal_liver?1:0);
  const drugs_alc = (i.drugs_antiplatelet_nsaid?1:0) + (i.alcohol?1:0);
  const pts = (i.hypertension?1:0) + Math.min(abn,2) + (i.stroke?1:0) + (i.bleeding?1:0) + (i.labile_inr?1:0) + (i.age_gt65?1:0) + Math.min(drugs_alc,2);
  return { HAS_BLED: pts, high_risk: pts>=3 };
}
register({ id:"has_bled", label:"HAS‑BLED", inputs:[
  {key:"hypertension",required:true},{key:"abnormal_renal",required:true},{key:"abnormal_liver",required:true},
  {key:"stroke",required:true},{key:"bleeding",required:true},{key:"labile_inr",required:true},{key:"age_gt65",required:true},
  {key:"drugs_antiplatelet_nsaid",required:true},{key:"alcohol",required:true}
], run: runHASBLED as any });
