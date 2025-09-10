/**
 * HACOR score: predicts NIV failure.
 * Components and bins from published table:
 * - Heart rate (bpm): <=120 = 0; >120 = +1
 * - pH: >=7.35 = 0; 7.30–7.34 = +2; 7.25–7.29 = +3; <7.25 = +4
 * - GCS: 15 = 0; 13–14 = +2; 11–12 = +5; <=10 = +10
 * - PaO2/FiO2 (PF): >=201 = 0; 176–200 = +2; 151–175 = +3; <=150 = +6
 * - Respiratory rate (breaths/min): <=30 = 0; 31–35 = +1; 36–40 = +2; >40 = +4
 * Total 0–25. Higher is worse.
 */
export interface HACORInput {
  heart_rate_bpm: number;
  ph: number;
  gcs: number;
  pao2_over_fio2: number; // PF ratio
  rr_bpm: number;
}
export interface HACOROutput {
  points: number;
  breakdown: { hr:number; ph:number; gcs:number; pf:number; rr:number };
}
function binHR(hr:number){ return hr>120?1:0; }
function binPH(ph:number){ if (ph<7.25) return 4; if (ph<7.30) return 3; if (ph<7.35) return 2; return 0; }
function binGCS(g:number){ if (g<=10) return 10; if (g<=12) return 5; if (g<=14) return 2; return 0; }
function binPF(pf:number){ if (pf<=150) return 6; if (pf<=175) return 3; if (pf<=200) return 2; return 0; }
function binRR(rr:number){ if (rr>40) return 4; if (rr>=36) return 2; if (rr>=31) return 1; return 0; }
export function runHACOR(i:HACORInput): HACOROutput {
  const hr = binHR(i.heart_rate_bpm);
  const ph = binPH(i.ph);
  const gcs = binGCS(i.gcs);
  const pf = binPF(i.pao2_over_fio2);
  const rr = binRR(i.rr_bpm);
  const points = hr+ph+gcs+pf+rr;
  return { points, breakdown: { hr, ph, gcs, pf, rr } };
}
