
import { register } from "../registry";

// TIMI for UA/NSTEMI (7 items)
export type TIMI_UA_NSTEMI_Inputs = {
  age_years: number,
  risk_factors_count: number, // >=3 traditional RFs
  known_cad_ge50pct: boolean,
  aspirin_7d: boolean,
  severe_angina_24h: boolean, // >=2 episodes
  st_deviation_mm_ge_0_5: boolean,
  positive_marker: boolean
};

export function runTIMI_UA_NSTEMI(i: TIMI_UA_NSTEMI_Inputs){
  if (i==null) return null;
  const pts = (i.age_years>=65?1:0) + (i.risk_factors_count>=3?1:0) + (i.known_cad_ge50pct?1:0) +
              (i.aspirin_7d?1:0) + (i.severe_angina_24h?1:0) + (i.st_deviation_mm_ge_0_5?1:0) +
              (i.positive_marker?1:0);
  return { TIMI_UA_NSTEMI: pts, risk_band: pts<=2?"low (0–2)": pts<=4?"intermediate (3–4)":"high (5–7)" };
}

// TIMI for STEMI (AMI), simplified variant used in many tools
export type TIMI_STEMI_Inputs = {
  age_ge75: boolean,
  age_65_74: boolean,
  risk_factors_ge3: boolean, // DM/HTN/HLD/smoker/FHx
  prior_angi_na?: boolean,
  sbp_lt100: boolean,
  hr_gt100: boolean,
  anterior_ste_or_lbbb: boolean,
  time_to_tx_gt4h: boolean,
  weight_lt67kg: boolean
};

export function runTIMI_STEMI(i: TIMI_STEMI_Inputs){
  if (i==null) return null;
  let pts = 0;
  if (i.age_ge75) pts += 3;
  else if (i.age_65_74) pts += 2;
  if (i.risk_factors_ge3) pts += 1;
  if (i.sbp_lt100) pts += 3;
  if (i.hr_gt100) pts += 2;
  if (i.anterior_ste_or_lbbb) pts += 1;
  if (i.time_to_tx_gt4h) pts += 1;
  if (i.weight_lt67kg) pts += 1;
  return { TIMI_STEMI: pts };
}

register({ id:"timi_ua_nstemi", label:"TIMI (UA/NSTEMI)", inputs:[
  {key:"age_years",required:true},{key:"risk_factors_count",required:true},{key:"known_cad_ge50pct",required:true},
  {key:"aspirin_7d",required:true},{key:"severe_angina_24h",required:true},{key:"st_deviation_mm_ge_0_5",required:true},
  {key:"positive_marker",required:true}
], run: runTIMI_UA_NSTEMI as any });

register({ id:"timi_stemi", label:"TIMI (STEMI simplified)", inputs:[
  {key:"age_ge75",required:true},{key:"age_65_74",required:true},{key:"risk_factors_ge3",required:true},
  {key:"sbp_lt100",required:true},{key:"hr_gt100",required:true},{key:"anterior_ste_or_lbbb",required:true},
  {key:"time_to_tx_gt4h",required:true},{key:"weight_lt67kg",required:true}
], run: runTIMI_STEMI as any });
