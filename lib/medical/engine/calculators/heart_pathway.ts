
// lib/medical/engine/calculators/heart_pathway.ts
// HEART score + 0/3h troponin gating for HEART Pathway.

export interface HeartPathwayInput {
  history_score: 0|1|2;            // clinician gestalt for history
  ecg_score: 0|1|2;                // 0 normal, 1 nonspecific, 2 significant ST-deviation
  age_years: number;               // age in years
  risk_factors_count: number;      // HTN, HLD, DM, obesity, smoking, FHx CAD etc.
  known_atherosclerotic_disease?: boolean | null; // CAD, PAD, cerebrovascular disease
  troponin0: number;               // value in ng/L or ng/mL (use same units as ULN)
  troponin3h?: number | null;      // 3-hour value (same units). If absent, pathway_low_risk will be false.
  troponin_uln: number;            // assay-specific ULN in same units
}

export interface HeartPathwayOutput {
  heart_components: { history:number; ecg:number; age:number; risk:number; troponin:number; };
  heart_score_total: number;
  both_troponins_negative: boolean;
  heart_pathway_low_risk: boolean; // TRUE if HEART ≤3 AND both troponins ≤ ULN
}

function agePoints(age:number):0|1|2 {
  if (age >= 65) return 2;
  if (age >= 45) return 1;
  return 0;
}
function riskPoints(count:number, knownAthero:boolean):0|1|2 {
  if (knownAthero || count >= 3) return 2;
  if (count >= 1) return 1;
  return 0;
}
function troponinPoints(t:number, uln:number):0|1|2 {
  if (uln <= 0) return 0;
  const ratio = t / uln;
  if (ratio > 3) return 2;
  if (ratio > 1) return 1;
  return 0;
}

export function runHeartPathway(i: HeartPathwayInput): HeartPathwayOutput {
  const age = agePoints(i.age_years);
  const risk = riskPoints(Math.max(0, i.risk_factors_count|0), !!i.known_atherosclerotic_disease);
  const troponin0Pts = troponinPoints(i.troponin0, i.troponin_uln);
  const troponin3 = i.troponin3h ?? i.troponin0;
  const troponin3Pts = troponinPoints(troponin3, i.troponin_uln);
  const troponinMax = Math.max(troponin0Pts, troponin3Pts);

  const comps = { history: i.history_score, ecg: i.ecg_score, age, risk, troponin: troponinMax };
  const total = comps.history + comps.ecg + comps.age + comps.risk + comps.troponin;

  const bothNeg = (i.troponin0 <= i.troponin_uln) && ((i.troponin3h ?? i.troponin0) <= i.troponin_uln);
  const lowRisk = (total <= 3) && bothNeg;
  return { heart_components: comps, heart_score_total: total, both_troponins_negative: bothNeg, heart_pathway_low_risk: lowRisk };
}
