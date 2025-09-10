import { round } from "./utils";

export interface TIMIUAInput {
  age_ge_65: boolean;
  risk_factors_ge_3: boolean;
  known_cad_ge_50: boolean;
  aspirin_7d: boolean;
  severe_angina_ge_2_24h: boolean;
  st_deviation_ge_0_5mm: boolean;
  positive_markers: boolean;
}
export function runTIMI_UA_NSTEMI(i: TIMIUAInput) {
  const fields = Object.values(i);
  const score = fields.reduce((s, v) => s + (v ? 1 : 0), 0);
  const risk = score >= 5 ? "high" : (score >= 3 ? "intermediate" : "low");
  return { score, risk };
}

export interface TIMISTEMIInput {
  age_years: number;
  diabetes_htn_or_angina: boolean;
  sbp_lt_100: boolean;
  hr_gt_100: boolean;
  killip_II_to_IV: boolean;
  weight_lt_67kg: boolean;
  anterior_STEMI_or_LBBB: boolean;
  time_to_treatment_gt_4h: boolean;
}
export function runTIMI_STEMI(i: TIMISTEMIInput) {
  let score = 0;
  if (i.age_years >= 75) score += 3;
  else if (i.age_years >= 65) score += 2;
  else if (i.age_years >= 45) score += 1;
  if (i.diabetes_htn_or_angina) score += 1;
  if (i.sbp_lt_100) score += 3;
  if (i.hr_gt_100) score += 2;
  if (i.killip_II_to_IV) score += 2;
  if (i.weight_lt_67kg) score += 1;
  if (i.anterior_STEMI_or_LBBB) score += 1;
  if (i.time_to_treatment_gt_4h) score += 1;
  return { score };
}

export interface HEARTInput {
  history: 0|1|2;
  ecg: 0|1|2;
  age_years: number;
  risk_factors_count: number;
  troponin_band: 0|1|2;
}
export function runHEART(i: HEARTInput) {
  const agePts = i.age_years >= 65 ? 2 : (i.age_years >= 45 ? 1 : 0);
  const rfPts = i.risk_factors_count >= 3 ? 2 : (i.risk_factors_count >= 1 ? 1 : 0);
  const total = i.history + i.ecg + agePts + rfPts + i.troponin_band;
  const risk = total >= 7 ? "high" : (total >= 4 ? "intermediate" : "low");
  return { score: total, risk };
}

export interface SgarbossaModifiedInput {
  concordant_ST_elevation_mm: number; // max in any lead
  concordant_ST_depression_V1toV3_mm: number; // max
  st_deviation_mm: number; // ST elevation magnitude in worst discordant lead
  s_wave_depth_mm: number; // S in the same lead as discordant ST
}
export function runSmithModifiedSgarbossa(i: SgarbossaModifiedInput) {
  const crit1 = i.concordant_ST_elevation_mm >= 1;
  const crit2 = i.concordant_ST_depression_V1toV3_mm >= 1;
  const ratio = (i.s_wave_depth_mm > 0) ? (i.st_deviation_mm / i.s_wave_depth_mm) : 0;
  const crit3 = ratio <= -0.25; // discordant STE with ST/S <= -0.25
  const positive = crit1 || crit2 || crit3;
  return { positive, details: { crit1, crit2, ratio: round(ratio, 2), crit3 } };
}

export function runKillipClass(hfSigns: { rales?: boolean, s3?: boolean, pulmonary_edema?: boolean, shock?: boolean }) {
  if (hfSigns.shock) return { class: 4 as const };
  if (hfSigns.pulmonary_edema) return { class: 3 as const };
  if (hfSigns.rales || hfSigns.s3) return { class: 2 as const };
  return { class: 1 as const };
}

export interface CharlsonInput {
  age_years: number;
  conditions: Partial<Record<
    "mi"|"chf"|"pvd"|"cva_tia"|"dementia"|"copd"|"ctd"|"ulcer"|"mild_liver"|"diabetes"|"hemiplegia"|"mod_severe_renal"|"diabetes_end_org"|"any_tumor"|"leukemia"|"lymphoma"|"mod_severe_liver"|"metastatic_solid"|"aids", boolean>>;
}
export function runCharlson(i: CharlsonInput) {
  const w = {
    mi:1,chf:1,pvd:1,cva_tia:1,dementia:1,copd:1,ctd:1,ulcer:1,mild_liver:1,diabetes:1,
    hemiplegia:2,mod_severe_renal:2,diabetes_end_org:2,any_tumor:2,leukemia:2,lymphoma:2,
    mod_severe_liver:3,metastatic_solid:6,aids:6
  } as const;
  let score = 0;
  for (const k in w) {
    const key = k as keyof typeof w;
    if (i.conditions[key]) score += w[key];
  }
  // Age points: 1 per decade over 40
  const agePts = Math.max(0, Math.floor((i.age_years - 40)/10));
  score += agePts;
  return { score };
}
