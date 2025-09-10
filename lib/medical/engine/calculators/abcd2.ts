import { register } from "../registry";

export function runABCD2(i:{ age_ge60:boolean, sbp_ge140_or_dbp_ge90:boolean, clinical_weakness:boolean, clinical_speech_only:boolean, duration_ge60min:boolean, duration_10_59min:boolean, diabetes:boolean }){
  if (i==null) return null;
  let pts=0;
  pts += i.age_ge60?1:0;
  pts += i.sbp_ge140_or_dbp_ge90?1:0;
  pts += i.clinical_weakness?2 : i.clinical_speech_only?1 : 0;
  pts += i.duration_ge60min?2 : i.duration_10_59min?1 : 0;
  pts += i.diabetes?1:0;
  let band="low (0–3)"; if (pts>=6) band="high (6–7)"; else if (pts>=4) band="moderate (4–5)";
  return { ABCD2: pts, risk_band: band };
}
register({ id:"abcd2_tia", label:"ABCD2 (TIA risk)", inputs:[
  {key:"age_ge60",required:true},{key:"sbp_ge140_or_dbp_ge90",required:true},{key:"clinical_weakness",required:true},{key:"clinical_speech_only",required:true},
  {key:"duration_ge60min",required:true},{key:"duration_10_59min",required:true},{key:"diabetes",required:true}
], run: runABCD2 as any });
