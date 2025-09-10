
import { register } from "../registry";

/**
 * GRACE (scaffold): collects inputs, computes a surrogate sum, and gives a coarse band.
 * Replace `computeSurrogate` with official mapping to get exact risk %.
 */
export type GRACEInputs = {
  age_years: number,
  hr_bpm: number,
  sbp_mmHg: number,
  creat_mg_dL: number,
  killip_class: 1|2|3|4,
  st_deviation: boolean,
  cardiac_arrest_at_admit: boolean,
  elevated_markers: boolean
};

function computeSurrogate(i:GRACEInputs){
  // Simple surrogate: scaled z-scores + categorical weights (NOT the official GRACE table)
  const w = (
    (i.age_years/10) +
    (i.hr_bpm/50) +
    ((120 - Math.min(i.sbp_mmHg,120))/20) +
    (i.creat_mg_dL*2) +
    (i.killip_class*3) +
    (i.st_deviation?3:0) +
    (i.cardiac_arrest_at_admit?5:0) +
    (i.elevated_markers?2:0)
  );
  return Math.round(w);
}

export function runGRACE(i:GRACEInputs){
  if ([i.age_years,i.hr_bpm,i.sbp_mmHg,i.creat_mg_dL,i.killip_class].some(v=>v==null || !isFinite(v as number))) return null;
  const surrogate = computeSurrogate(i);
  const band = surrogate<10 ? "low" : surrogate<20 ? "intermediate" : "high";
  return { GRACE_surrogate: surrogate, risk_band: band, note: "Scaffold—replace with official GRACE mapping to get % risk" };
}

register({ id:"grace_full_scaffold", label:"GRACE (scaffold)", inputs:[
  {key:"age_years",required:true},{key:"hr_bpm",required:true},{key:"sbp_mmHg",required:true},{key:"creat_mg_dL",required:true},
  {key:"killip_class",required:true},{key:"st_deviation",required:true},{key:"cardiac_arrest_at_admit",required:true},{key:"elevated_markers",required:true}
], run: runGRACE as any });
