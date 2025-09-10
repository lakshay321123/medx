/**
 * SMART-COP (Clin Infect Dis. 2008;47:375-84)
 * Predicts need for Intensive Respiratory or Vasopressor Support (IRVS) in CAP.
 * Points:
 *  - Systolic BP <=90 mmHg: 2
 *  - Multilobar CXR involvement: 1
 *  - Albumin <3.5 g/dL (35 g/L): 1
 *  - Respiratory rate: >=25 if age <=50; >=30 if age >50: 1
 *  - Tachycardia >=125 bpm: 1
 *  - Confusion (acute): 1
 *  - Oxygenation (age-based): if age <=50 then PaO2<70 or SpO2<=93% or P/F<333 → 2; if age>50 then PaO2<60 or SpO2<=90% or P/F<250 → 2
 *  - pH <7.35: 2
 * Risk: 0–2 low; 3–4 moderate; 5–6 high; >=7 very high.
 */

export interface SMARTCOPInput {
  age_years: number;
  sbp_mmHg: number;
  multilobar_infiltrates?: boolean;
  albumin_g_dL?: number; // g/dL (use 35 g/L == 3.5 g/dL threshold)
  rr_per_min?: number;
  hr_bpm?: number;
  confusion?: boolean;
  spo2_perc?: number; // % on room air if possible
  pao2_mmHg?: number;
  p_f_ratio?: number; // PaO2/FiO2, optional alternative to PaO2/SpO2
  ph_arterial?: number;
}

export interface SMARTCOPOutput {
  score: number;
  risk: "Low" | "Moderate" | "High" | "Very high";
  details: Record<string, number>;
}

export function runSMARTCOP(i: SMARTCOPInput): SMARTCOPOutput {
  const d: Record<string, number> = {};
  d.SBP = i.sbp_mmHg <= 90 ? 2 : 0;
  d.Multilobar = i.multilobar_infiltrates ? 1 : 0;
  d.Albumin = (i.albumin_g_dL !== undefined && i.albumin_g_dL < 3.5) ? 1 : 0;

  const rrFlag = (i.rr_per_min !== undefined) && ((i.age_years <= 50 && i.rr_per_min >= 25) || (i.age_years > 50 && i.rr_per_min >= 30));
  d.RespiratoryRate = rrFlag ? 1 : 0;

  d.Tachycardia = (i.hr_bpm !== undefined && i.hr_bpm >= 125) ? 1 : 0;
  d.Confusion = i.confusion ? 1 : 0;

  let oxyMajor = false;
  if (i.p_f_ratio !== undefined) {
    if (i.age_years <= 50 && i.p_f_ratio < 333) oxyMajor = true;
    if (i.age_years > 50 && i.p_f_ratio < 250) oxyMajor = true;
  }
  if (i.pao2_mmHg !== undefined) {
    if (i.age_years <= 50 && i.pao2_mmHg < 70) oxyMajor = true;
    if (i.age_years > 50 && i.pao2_mmHg < 60) oxyMajor = true;
  }
  if (i.spo2_perc !== undefined) {
    if (i.age_years <= 50 && i.spo2_perc <= 93) oxyMajor = true;
    if (i.age_years > 50 && i.spo2_perc <= 90) oxyMajor = true;
  }
  d.Oxygenation = oxyMajor ? 2 : 0;

  d.pH = (i.ph_arterial !== undefined && i.ph_arterial < 7.35) ? 2 : 0;

  const score = Object.values(d).reduce((a, b) => a + b, 0);

  let risk: SMARTCOPOutput["risk"];
  if (score <= 2) risk = "Low";
  else if (score <= 4) risk = "Moderate";
  else if (score <= 6) risk = "High";
  else risk = "Very high";

  return { score, risk, details: d };
}
