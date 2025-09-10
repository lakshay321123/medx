
import { register } from "../registry";

export type HEARTInputs = {
  history_level: 0|1|2,      // slight/moderate/highly suspicious
  ecg_level: 0|1|2,          // normal/nonspecific/ST-deviation
  age_years: number,
  risk_factors_count: number,// HTN, HLD, DM, smoker, FHx, obesity, etc.
  troponin_level: 0|1|2      // normal/1-3x/>3x ULN
};

export function runHEART({ history_level, ecg_level, age_years, risk_factors_count, troponin_level }: HEARTInputs){
  if ([history_level,ecg_level,age_years,risk_factors_count,troponin_level].some(v=>v==null || !isFinite(v as number))) return null;
  const age_pts = age_years >= 65 ? 2 : age_years >= 45 ? 1 : 0;
  const rf_pts = risk_factors_count >= 3 ? 2 : risk_factors_count >= 1 ? 1 : 0;
  const total = history_level + ecg_level + age_pts + rf_pts + troponin_level;
  const band = total <=3 ? "low (0–3)" : total <=6 ? "moderate (4–6)" : "high (7–10)";
  return { HEART: total, risk_band: band };
}

register({ id:"heart_score", label:"HEART score", inputs:[
  {key:"history_level",required:true},{key:"ecg_level",required:true},{key:"age_years",required:true},
  {key:"risk_factors_count",required:true},{key:"troponin_level",required:true}
], run: runHEART as any });
