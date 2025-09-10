// lib/medical/engine/calculators/cspine_rule.ts

export interface CSpineInput {
  age_years: number;
  dangerous_mechanism: boolean;
  paresthesias_in_extremities: boolean;

  low_risk_simple_rear_end: boolean;
  low_risk_sitting_in_ed: boolean;
  low_risk_delayed_onset: boolean;
  low_risk_no_midline_tenderness: boolean;

  actively_rotates_45_right_and_left: boolean;
}

/** Returns whether imaging is indicated per Canadian C-Spine Rule. */
export function runCanadianCSpine(i: CSpineInput) {
  // High-risk factors mandate imaging
  if (i.age_years >= 65 || i.dangerous_mechanism || i.paresthesias_in_extremities) {
    return { imaging_indicated: true, reason: "High-risk factor present" };
  }

  // If any low-risk factor present, assess range of motion
  const anyLowRisk = i.low_risk_simple_rear_end || i.low_risk_sitting_in_ed ||
    i.low_risk_delayed_onset || i.low_risk_no_midline_tenderness;

  if (anyLowRisk) {
    if (i.actively_rotates_45_right_and_left) {
      return { imaging_indicated: false, reason: "Low-risk + able to rotate 45° both ways" };
    }
    return { imaging_indicated: true, reason: "Low-risk but cannot rotate 45°" };
  }

  // No low-risk factors → imaging
  return { imaging_indicated: true, reason: "No low-risk factor to permit safe assessment" };
}
