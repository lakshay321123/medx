// lib/medical/engine/calculators/cardio_tools.ts
// Cardiology helpers: TIMI (UA/NSTEMI + STEMI), HEART, Modified Sgarbossa,
// Killip class, and Charlson Comorbidity Index (with optional age adjustment).

import * as U from "./utils";

// Safe local round fallback if utils.round is not present in your tree.
const round: (v: number, d?: number) => number =
  // @ts-ignore – optional chaining guard for trees without utils.round
  (U as any).round ?? ((v: number, decimals = 0) => {
    if (!Number.isFinite(v)) return v as number;
    const p = Math.pow(10, decimals);
    return Math.round(v * p) / p;
  });

/* -------------------------------------------------------------------------- */
/*                              TIMI UA/NSTEMI                                */
/* -------------------------------------------------------------------------- */

export interface TIMIUAInput {
  age_ge_65: boolean;
  three_risk_factors: boolean;         // ≥3 CAD risk factors
  known_cad_ge_50_stenosis: boolean;   // prior stenosis ≥50%
  aspirin_use_7d: boolean;             // aspirin in last 7 days
  severe_angina_24h: boolean;          // ≥2 angina episodes in 24h
  st_deviation: boolean;               // ST deviation ≥0.5 mm
  positive_markers: boolean;           // elevated troponin/CK-MB
}

export function runTIMI_UA_NSTEMI(i: TIMIUAInput) {
  const pts =
    (i.age_ge_65 ? 1 : 0) +
    (i.three_risk_factors ? 1 : 0) +
    (i.known_cad_ge_50_stenosis ? 1 : 0) +
    (i.aspirin_use_7d ? 1 : 0) +
    (i.severe_angina_24h ? 1 : 0) +
    (i.st_deviation ? 1 : 0) +
    (i.positive_markers ? 1 : 0);

  const band = pts >= 5 ? "high" : pts >= 3 ? "intermediate" : "low";
  return { TIMI_UA_NSTEMI_points: pts, risk_band: band as "low" | "intermediate" | "high" };
}

/* -------------------------------------------------------------------------- */
/*                                 TIMI STEMI                                 */
/* -------------------------------------------------------------------------- */

export interface TIMISTEMIInput {
  age_years: number;
  sbp_mmHg: number;
  hr_bpm: number;
  killip_class_II_to_IV: boolean;
  weight_kg?: number | null;
  anterior_ste_or_lbbb: boolean;      // anterior STE or new/ presumed-new LBBB
  time_to_treatment_gt_4h: boolean;
  dm_htn_or_angina_history: boolean;  // any of the three
}

export function runTIMI_STEMI(i: TIMISTEMIInput) {
  const age = i.age_years;
  const agePts = age >= 75 ? 3 : age >= 65 ? 2 : 0;
  const sbpPts = i.sbp_mmHg < 100 ? 3 : 0;
  const hrPts = i.hr_bpm > 100 ? 2 : 0;
  const killipPts = i.killip_class_II_to_IV ? 2 : 0;
  const wtPts = (typeof i.weight_kg === "number" && i.weight_kg < 67) ? 1 : 0;
  const antPts = i.anterior_ste_or_lbbb ? 1 : 0;
  const tttPts = i.time_to_treatment_gt_4h ? 1 : 0;
  const hxPts = i.dm_htn_or_angina_history ? 1 : 0;

  const pts = agePts + sbpPts + hrPts + killipPts + wtPts + antPts + tttPts + hxPts;
  const band = pts >= 5 ? "high" : pts >= 3 ? "intermediate" : "low";
  return { TIMI_STEMI_points: pts, risk_band: band as "low" | "intermediate" | "high" };
}

/* -------------------------------------------------------------------------- */
/*                                   HEART                                    */
/* -------------------------------------------------------------------------- */

export interface HEARTInput {
  history_level: 0 | 1 | 2;              // 0 = slightly, 1 = moderate, 2 = highly suspicious
  ecg_level: 0 | 1 | 2;                  // 0 = normal, 1 = nonspecific repol, 2 = ST deviation
  age_years: number;
  risk_factors_count: number;            // # of RFs or known atherosclerosis
  has_known_atherosclerosis?: boolean;   // counts as ≥3 RF
  troponin_ratio_to_uln: number;         // measured troponin / assay ULN
}

export function runHEART(i: HEARTInput) {
  const agePts = i.age_years >= 65 ? 2 : i.age_years >= 45 ? 1 : 0;
  const rf3plus = i.has_known_atherosclerosis || i.risk_factors_count >= 3;
  const rfPts = rf3plus ? 2 : i.risk_factors_count >= 1 ? 1 : 0;

  const troponinPts = i.troponin_ratio_to_uln > 3 ? 2 : i.troponin_ratio_to_uln > 1 ? 1 : 0;

  const total =
    (i.history_level ?? 0) +
    (i.ecg_level ?? 0) +
    agePts +
    rfPts +
    troponinPts;

  const band = total >= 7 ? "high" : total >= 4 ? "moderate" : "low";
  return { HEART_points: total, risk_band: band as "low" | "moderate" | "high" };
}

/* -------------------------------------------------------------------------- */
/*                           Modified Sgarbossa (Smith)                        */
/* -------------------------------------------------------------------------- */

export interface SgarbossaLeadData {
  lead: string;
  st_mm: number;        // positive for STE, negative for STD
  s_mm?: number | null; // S-wave depth (absolute magnitude). Needed for discordant rule.
  is_V1_to_V3?: boolean;
}

export interface ModifiedSgarbossaInput {
  leads: SgarbossaLeadData[];  // Provide per-lead ST and S depths
}

/**
 * Returns positivity per the Smith-modified Sgarbossa criteria:
 *  1) Concordant STE ≥ 1 mm in any lead (rule A)
 *  2) Concordant STD ≥ 1 mm in V1–V3 (rule B)
 *  3) Excessively discordant STE: ST/S ≤ −0.25 (i.e., STE magnitude ≥ 25% of S) in any lead (rule C)
 */
export function runModifiedSgarbossa(i: ModifiedSgarbossaInput) {
  const reasons: string[] = [];
  let positive = false;

  for (const l of i.leads) {
    // Rule A: concordant STE ≥1 mm
    if (l.st_mm >= 1) {
      reasons.push(`Concordant STE ≥1 mm in ${l.lead}`);
      positive = true;
      break;
    }
    // Rule B: concordant STD ≥1 mm in V1–V3
    if (l.st_mm <= -1 && l.is_V1_to_V3) {
      reasons.push(`Concordant STD ≥1 mm in ${l.lead} (V1–V3)`);
      positive = true;
      break;
    }
    // Rule C: discordant STE with ST/S ≤ −0.25
    if ((l.st_mm ?? 0) > 0 && typeof l.s_mm === "number" && l.s_mm! > 0) {
      const ratio = - (l.st_mm / l.s_mm); // negative by convention (ST up, S negative)
      if (ratio >= 0.25) {
        reasons.push(`Excessively discordant STE in ${l.lead} (ST/S=${round(ratio, 2)} ≥ 0.25)`);
        positive = true;
        break;
      }
    }
  }

  if (!positive && reasons.length === 0) {
    reasons.push("No modified Sgarbossa criteria met");
  }
  return { modified_sgarbossa_positive: positive, reasons };
}

/* -------------------------------------------------------------------------- */
/*                                Killip class                                */
/* -------------------------------------------------------------------------- */

export interface KillipInput {
  rales?: boolean;
  s3?: boolean;
  pulmonary_edema?: boolean;
  shock?: boolean; // hypotension with hypoperfusion
}

export function runKillipClass(i: KillipInput) {
  // Class IV supersedes others
  if (i.shock) return { class: 4 as const, label: "Shock (IV)" };
  if (i.pulmonary_edema) return { class: 3 as const, label: "Pulmonary edema (III)" };
  if (i.rales || i.s3) return { class: 2 as const, label: "Rales/S3 (II)" };
  return { class: 1 as const, label: "No signs of HF (I)" };
}

/* -------------------------------------------------------------------------- */
/*                           Charlson Comorbidity Index                        */
/* -------------------------------------------------------------------------- */

export interface CharlsonConditions {
  mi?: boolean; chf?: boolean; pvd?: boolean; cva_tia?: boolean; dementia?: boolean;
  copd?: boolean; rheum?: boolean; pud?: boolean; mild_liver?: boolean; diabetes_wo_organ_damage?: boolean;
  hemiplegia?: boolean; mod_severe_renal?: boolean; diabetes_with_organ_damage?: boolean;
  any_tumor?: boolean; leukemia?: boolean; lymphoma?: boolean;
  mod_severe_liver?: boolean; metastatic_solid?: boolean; aids?: boolean;
}

export interface CharlsonInput {
  conditions: CharlsonConditions;
  age_years?: number | null; // optional age for age-adjusted CCI
}

export function runCharlson(i: CharlsonInput) {
  const c = i.conditions || {};
  // 1 point each
  let score =
    (c.mi ? 1 : 0) + (c.chf ? 1 : 0) + (c.pvd ? 1 : 0) + (c.cva_tia ? 1 : 0) + (c.dementia ? 1 : 0) +
    (c.copd ? 1 : 0) + (c.rheum ? 1 : 0) + (c.pud ? 1 : 0) + (c.mild_liver ? 1 : 0) +
    (c.diabetes_wo_organ_damage ? 1 : 0);

  // 2 points each
  score +=
    (c.hemiplegia ? 2 : 0) + (c.mod_severe_renal ? 2 : 0) + (c.diabetes_with_organ_damage ? 2 : 0) +
    (c.any_tumor ? 2 : 0) + (c.leukemia ? 2 : 0) + (c.lymphoma ? 2 : 0);

  // 3 points
  score += (c.mod_severe_liver ? 3 : 0);

  // 6 points each
  score += (c.metastatic_solid ? 6 : 0) + (c.aids ? 6 : 0);

  // Optional age adjustment: +1 per decade ≥50 (i.e., 50–59:+1, 60–69:+2, 70–79:+3, ≥80:+4)
  let age_points = 0;
  const age = typeof i.age_years === "number" ? i.age_years : null;
  if (age != null) {
    if (age >= 80) age_points = 4;
    else if (age >= 70) age_points = 3;
    else if (age >= 60) age_points = 2;
    else if (age >= 50) age_points = 1;
  }

  const total = score + age_points;
  return { score, age_points, total };
}

/* -------------------------------------------------------------------------- */
/*                                   Exports                                  */
/* -------------------------------------------------------------------------- */

export const CardioTools = {
  runTIMI_UA_NSTEMI,
  runTIMI_STEMI,
  runHEART,
  runModifiedSgarbossa,
  runKillipClass,
  runCharlson,
};
