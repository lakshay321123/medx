// lib/medical/engine/calculators/aims65.ts
// AIMS65 for upper GI bleed: Albumin <3.0 g/dL, INR >1.5, Mental status altered, SBP ≤90 mmHg, Age ≥65.
// 1 point each (0–5). Higher score indicates higher short-term mortality risk.

export interface AIMS65Input {
  albumin_g_dL?: number | null;
  inr?: number | null;
  altered_mental_status?: boolean | null;
  sbp_mmHg?: number | null;
  age_years?: number | null;
}

export interface AIMS65Output {
  points: number; // 0–5
  flags: {
    alb_lt_3: boolean;
    inr_gt_1_5: boolean;
    ams: boolean;
    sbp_le_90: boolean;
    age_ge_65: boolean;
  };
}

export function runAIMS65(i: AIMS65Input): AIMS65Output {
  const alb_lt_3 = (i.albumin_g_dL ?? Infinity) < 3.0;
  const inr_gt_1_5 = (i.inr ?? -Infinity) > 1.5;
  const ams = !!i.altered_mental_status;
  const sbp_le_90 = (i.sbp_mmHg ?? Infinity) <= 90;
  const age_ge_65 = (i.age_years ?? -Infinity) >= 65;

  const points = (alb_lt_3?1:0)+(inr_gt_1_5?1:0)+(ams?1:0)+(sbp_le_90?1:0)+(age_ge_65?1:0);

  return { points, flags: { alb_lt_3, inr_gt_1_5, ams, sbp_le_90, age_ge_65 } };
}
