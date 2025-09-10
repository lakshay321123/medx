export interface CSpineInput {
  age_ge_65: boolean;
  dangerous_mechanism: boolean;
  paresthesias_in_extremities: boolean;
  low_risk_factor_present: boolean; // e.g., simple rear-end, sitting position, ambulatory, delayed pain, no midline tenderness
  able_to_rotate_45deg_left_and_right: boolean;
}

export function canadianCSpineRule(i: CSpineInput) {
  if (i.age_ge_65 || i.dangerous_mechanism || i.paresthesias_in_extremities) {
    return { imaging_indicated: true, reason: "High-risk factor" };
  }
  if (i.low_risk_factor_present) {
    if (i.able_to_rotate_45deg_left_and_right) return { imaging_indicated: false };
    return { imaging_indicated: true, reason: "Cannot actively rotate neck 45°" };
  }
  return { imaging_indicated: true, reason: "No low-risk factor to allow safe assessment" };
}
