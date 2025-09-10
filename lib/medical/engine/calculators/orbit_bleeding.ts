import { register } from "../registry";

export type ORBITInputs = {
  age_ge75:boolean, low_hgb_or_hct_or_anemia:boolean, eGFR_lt60:boolean,
  bleeding_history:boolean, antiplatelet_therapy:boolean
};
export function runORBIT(i:ORBITInputs){
  if (i==null) return null;
  let pts = 0;
  pts += i.age_ge75?1:0;
  pts += i.low_hgb_or_hct_or_anemia?2:0;
  pts += i.eGFR_lt60?1:0;
  pts += i.bleeding_history?2:0;
  pts += i.antiplatelet_therapy?1:0;
  let band = "low"; if (pts>=4) band="high"; else if (pts>=2) band="medium";
  return { ORBIT: pts, risk_band: band };
}
register({ id:"orbit_bleeding", label:"ORBIT bleeding (AF)", inputs:[
  {key:"age_ge75",required:true},{key:"low_hgb_or_hct_or_anemia",required:true},{key:"eGFR_lt60",required:true},
  {key:"bleeding_history",required:true},{key:"antiplatelet_therapy",required:true}
], run: runORBIT as any });
