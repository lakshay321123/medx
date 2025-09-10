// lib/medical/engine/calculators/hacor.ts
// HACOR score for NIV failure prediction: Heart rate, pH, GCS, PaO2/FiO2, Respiratory rate.

export interface HACORInput {
  hr_bpm?: number | null;
  arterial_pH?: number | null;
  gcs?: number | null;
  pf_ratio?: number | null;
  rr_bpm?: number | null;
}

export interface HACOROutput {
  points: number;
  components: { hr: number; ph: number; gcs: number; pf: number; rr: number };
}

function ptsHR(hr:number){ if(hr>=120)return 2; if(hr>=100)return 1; return 0; }
function ptsPH(p:number){ if(p<7.25)return 4; if(p<7.30)return 3; if(p<7.35)return 2; return 0; }
function ptsGCS(g:number){ const v=Math.max(3,Math.min(15,Math.round(g))); if(v<11)return 5; if(v<13)return 3; return 0; }
function ptsPF(p:number){ if(p<150)return 3; if(p<200)return 2; if(p<250)return 1; return 0; }
function ptsRR(r:number){ if(r>=30)return 1; return 0; }

export function runHACOR(i: HACORInput): HACOROutput {
  const c_hr = (i.hr_bpm ?? null) !== null ? ptsHR(i.hr_bpm as number) : 0;
  const c_ph = (i.arterial_pH ?? null) !== null ? ptsPH(i.arterial_pH as number) : 0;
  const c_gcs = (i.gcs ?? null) !== null ? ptsGCS(i.gcs as number) : 0;
  const c_pf = (i.pf_ratio ?? null) !== null ? ptsPF(i.pf_ratio as number) : 0;
  const c_rr = (i.rr_bpm ?? null) !== null ? ptsRR(i.rr_bpm as number) : 0;
  const total = c_hr + c_ph + c_gcs + c_pf + c_rr;
  return { points: total, components: { hr: c_hr, ph: c_ph, gcs: c_gcs, pf: c_pf, rr: c_rr } };
}
