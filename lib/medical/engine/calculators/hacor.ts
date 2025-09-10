
/**
 * HACOR score (for NIV failure prediction in AECOPD, generalized often to hypoxemic failure)
 * Variables: Heart rate, pH, GCS, PaO2/FiO2, Respiratory rate. 
 * Point allocations from published tables.
 * 
 * Reference example table: medtigo HACOR (reproduces original HACOR bins).
 */
export type HACORInputs = {
  heart_rate_bpm: number;
  ph: number;
  gcs: number;
  pao2_fio2: number; // mmHg
  respiratory_rate: number; // breaths/min
};

function pointsHeartRate(hr: number) {
  return hr >= 121 ? 1 : 0;
}
function pointsPH(ph: number) {
  if (ph < 7.25) return 4;
  if (ph < 7.30) return 3;      // 7.25–7.29
  if (ph < 7.35) return 2;      // 7.30–7.34
  return 0;                     // >=7.35
}
function pointsGCS(g: number) {
  if (g <= 10) return 10;
  if (g <= 12) return 5;
  if (g <= 14) return 2;
  return 0; // 15
}
function pointsPF(pf: number) {
  if (pf < 100) return 6;
  if (pf < 125) return 5;
  if (pf < 150) return 4;
  if (pf < 175) return 3;
  if (pf < 200) return 2;
  return 0; // >=200
}
function pointsRR(rr: number) {
  if (rr >= 40) return 3;
  if (rr >= 35) return 2;
  if (rr >= 30) return 1;
  return 0;
}

export function runHACOR(i: HACORInputs) {
  const total = pointsHeartRate(i.heart_rate_bpm) + pointsPH(i.ph) + pointsGCS(i.gcs) + pointsPF(i.pao2_fio2) + pointsRR(i.respiratory_rate);
  let risk: "lower" | "intermediate" | "higher";
  if (total >= 8) risk = "higher";
  else if (total >= 5) risk = "intermediate";
  else risk = "lower";
  return { HACOR_points: total, risk_band: risk };
}
