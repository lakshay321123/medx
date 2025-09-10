import { register } from "../registry";

export function runSTOPBANG(i:{ snoring:boolean, tired:boolean, observed_apnea:boolean, high_bp:boolean, bmi_gt35:boolean, age_gt50:boolean, neck_circ_cm_gt40:boolean, male:boolean }){
  if (i==null) return null;
  const pts = Object.values(i).filter(Boolean).length;
  let risk = "low (0–2)"; if (pts>=5) risk="high (5–8)"; else if (pts>=3) risk="intermediate (3–4)";
  return { STOP_Bang: pts, risk_band: risk };
}
register({ id:"stop_bang", label:"STOP‑Bang (OSA)", inputs:[
  {key:"snoring",required:true},{key:"tired",required:true},{key:"observed_apnea",required:true},{key:"high_bp",required:true},
  {key:"bmi_gt35",required:true},{key:"age_gt50",required:true},{key:"neck_circ_cm_gt40",required:true},{key:"male",required:true}
], run: runSTOPBANG as any });
