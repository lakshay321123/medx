
/**
 * OASIS score (Oxford Acute Severity of Illness Score).
 * Based on openly published point bins from MIT-LCP (Alistair Johnson).
 * Variables: age, GCS, HR, MAP, RR, Temp, Urine output (ml/day), mechanical ventilation, elective surgery, pre-ICU LOS, ICU type.
 */
export type OASISInputs = {
  age_years: number;
  gcs: number;
  heart_rate_bpm: number;
  map_mmHg: number;
  respiratory_rate: number;
  temperature_C: number;
  urine_output_mL_day: number;
  mech_vent: boolean;
  elective_surgery: boolean;
  preicu_los_days: number;
  icu_type: "CCU" | "CSRU" | "MICU" | "SICU" | "TSICU" | "Other";
};

function binAge(a:number){ if(a<24) return 0; if(a<=53) return 3; if(a<=77) return 6; if(a<=89) return 9; return 13; }
function binGCS(g:number){ if(g>=14) return 0; if(g>=11) return 5; if(g>=8) return 10; return 15; }
function binHR(h:number){ if(h<33) return 6; if(h<=88) return 0; if(h<=107) return 4; if(h<=143) return 7; return 13; }
function binMAP(m:number){ if(m<20) return 24; if(m<50) return 17; if(m<70) return 6; if(m<=109) return 0; return 6; }
function binRR(r:number){ if(r<6) return 10; if(r<=22) return 0; if(r<=30) return 6; return 9; }
function binTemp(t:number){ if(t<33.2) return 20; if(t<=35.0) return 16; if(t<=36.1) return 9; if(t<=38.4) return 0; if(t<=39.9) return 3; return 6; }
function binUrine(u:number){ if(u<142) return 10; if(u<=500) return 5; if(u<=1426) return 0; if(u<=2540) return 4; return 9; }
function binMechVent(v:boolean){ return v ? 9 : 0; }
function binElective(e:boolean){ return e ? 0 : 6; }
function binPreICU(d:number){ if(d<1) return 0; if(d<2) return 5; if(d<4) return 6; return 8; }
function binICU(t:OASISInputs["icu_type"]){ switch(t){ case "CSRU": return 0; case "CCU": return 3; case "MICU": return 6; case "SICU": return 8; case "TSICU": return 5; default: return 0; }}

export function runOASIS(i: OASISInputs){
  const score = binAge(i.age_years)+binGCS(i.gcs)+binHR(i.heart_rate_bpm)+binMAP(i.map_mmHg)+binRR(i.respiratory_rate)+binTemp(i.temperature_C)+binUrine(i.urine_output_mL_day)+binMechVent(i.mech_vent)+binElective(i.elective_surgery)+binPreICU(i.preicu_los_days)+binICU(i.icu_type);
  // Mortality calibration is dataset dependent; provide rough bands per literature
  const band = score>=50 ? "very high" : score>=40 ? "high" : score>=30 ? "intermediate" : "lower";
  return { OASIS_points: score, risk_band: band };
}
